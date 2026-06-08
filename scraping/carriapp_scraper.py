#!/usr/bin/env python3
"""
Conservative Carriapp scraper for IPC FOOD.

This script is intentionally limited:
- It checks robots.txt before scraping.
- It records a terms-page preflight before scraping.
- It extracts only visible product-like cards from https://www.carriapp.cl/store.
- It waits 2 to 4 seconds between browser actions.
- It writes a static JSON file that can be reviewed before any app integration.
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib import robotparser
from urllib.error import URLError
from urllib.request import Request, urlopen


BASE_URL = "https://www.carriapp.cl"
STORE_URL = f"{BASE_URL}/store"
ROBOTS_URL = f"{BASE_URL}/robots.txt"
SOURCE_NAME = "Carriapp"
USER_AGENT = "IPCFOODAcademicPrototype/1.0 (+respectful limited scraper)"

ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = ROOT / "output" / "carriapp_prices.json"
APP_READY_PATH = ROOT.parent / "data" / "prices-carriapp.json"

TERMS_CANDIDATES = [
    f"{BASE_URL}/terms",
    f"{BASE_URL}/terminos",
    f"{BASE_URL}/terminos-y-condiciones",
    f"{BASE_URL}/privacy",
    f"{BASE_URL}/politicas-de-privacidad",
]


@dataclass
class Product:
    id: str
    name: str
    price: int
    store: str
    category: str
    imageUrl: str
    productUrl: str
    extractedAt: str


def human_pause(min_seconds: float = 2.0, max_seconds: float = 4.0) -> None:
    """Wait between actions so the scraper behaves conservatively."""
    time.sleep(random.uniform(min_seconds, max_seconds))


def fetch_url_status(url: str, timeout: int = 15) -> dict[str, Any]:
    """Fetch only basic status/title metadata for preflight checks."""
    try:
        request = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(request, timeout=timeout) as response:
            body = response.read(200_000).decode("utf-8", errors="replace")
            title_match = re.search(r"<title>(.*?)</title>", body, re.I | re.S)
            return {
                "url": url,
                "ok": 200 <= response.status < 400,
                "status": response.status,
                "title": re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else "",
            }
    except Exception as exc:  # noqa: BLE001 - preflight should report, not crash.
        return {"url": url, "ok": False, "status": None, "error": str(exc)}


def check_robots() -> dict[str, Any]:
    """Check whether robots.txt allows fetching the store page."""
    parser = robotparser.RobotFileParser()
    parser.set_url(ROBOTS_URL)
    try:
        parser.read()
        allowed = parser.can_fetch(USER_AGENT, STORE_URL)
        return {"robotsUrl": ROBOTS_URL, "allowed": allowed, "error": ""}
    except Exception as exc:  # noqa: BLE001 - caller decides whether to abort.
        return {"robotsUrl": ROBOTS_URL, "allowed": False, "error": str(exc)}


def preflight() -> dict[str, Any]:
    """Review robots.txt and likely terms/privacy pages before scraping."""
    return {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "robots": check_robots(),
        "termsCandidates": [fetch_url_status(url) for url in TERMS_CANDIDATES],
    }


def normalize_price(value: str) -> int:
    digits = re.sub(r"[^\d]", "", value or "")
    return int(digits) if digits else 0


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9áéíóúñü]+", "-", value, flags=re.I)
    value = value.strip("-")
    return value or "producto"


def dedupe_products(products: list[Product]) -> list[Product]:
    """Avoid duplicates by product URL first, then normalized name + price."""
    seen: set[str] = set()
    unique: list[Product] = []
    for product in products:
        key = product.productUrl or f"{product.name.lower()}::{product.price}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(product)
    return unique


def extract_visible_products(page, max_products: int) -> list[Product]:
    """Run DOM heuristics in the page and convert results into Product objects."""
    raw_products = page.evaluate(
        """
        (maxProducts) => {
          const priceRegex = /\$\s?[0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|\$\s?[0-9]+/;
          const candidates = Array.from(document.querySelectorAll(
            'article, li, a, [class*="product" i], [class*="card" i], [data-testid*="product" i]'
          ));
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

          function clean(text) {
            return (text || '').replace(/\s+/g, ' ').trim();
          }

          function absolutize(url) {
            if (!url) return '';
            try { return new URL(url, location.href).href; } catch { return ''; }
          }

          const products = [];
          for (const el of candidates) {
            const rect = el.getBoundingClientRect();
            const visible = rect.width > 80 && rect.height > 40 && rect.bottom >= 0 && rect.top <= viewportHeight;
            if (!visible) continue;

            const text = clean(el.innerText || el.textContent || '');
            const priceMatch = text.match(priceRegex);
            if (!priceMatch) continue;

            const img = el.querySelector('img');
            const link = el.matches('a') ? el : el.querySelector('a[href]');
            const headings = Array.from(el.querySelectorAll('h1,h2,h3,h4,[aria-label]'))
              .map((node) => clean(node.getAttribute('aria-label') || node.textContent))
              .filter(Boolean);

            let name = headings[0] || clean(img?.alt) || text.replace(priceRegex, '').split(/[\n|•]/)[0];
            name = clean(name).slice(0, 140);
            if (!name || name.length < 2) continue;

            const storeHint = clean(el.querySelector('[class*="store" i], [class*="market" i], [class*="super" i]')?.textContent);
            const categoryHint = clean(el.closest('[data-category], section')?.getAttribute('data-category') || '');

            products.push({
              name,
              priceText: priceMatch[0],
              store: storeHint,
              category: categoryHint,
              imageUrl: absolutize(img?.currentSrc || img?.src || ''),
              productUrl: absolutize(link?.getAttribute('href') || '')
            });

            if (products.length >= maxProducts) break;
          }
          return products;
        }
        """,
        max_products,
    )

    extracted_at = datetime.now(timezone.utc).isoformat()
    products: list[Product] = []
    for index, item in enumerate(raw_products, start=1):
        name = str(item.get("name", "")).strip()
        price = normalize_price(str(item.get("priceText", "")))
        if not name or price <= 0:
            continue
        products.append(
            Product(
                id=f"{slugify(name)}-{price}-{index}",
                name=name,
                price=price,
                store=str(item.get("store") or ""),
                category=str(item.get("category") or ""),
                imageUrl=str(item.get("imageUrl") or ""),
                productUrl=str(item.get("productUrl") or ""),
                extractedAt=extracted_at,
            )
        )
    return dedupe_products(products)


def scrape(max_products: int, scroll_steps: int, headless: bool) -> dict[str, Any]:
    """Open Carriapp, wait for dynamic content and extract visible products."""
    compliance = preflight()
    if not compliance["robots"]["allowed"]:
        raise RuntimeError(f"robots.txt no permite scraping de {STORE_URL}: {compliance['robots']}")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright no está instalado. Ejecuta: pip install -r scraping/requirements.txt && playwright install chromium"
        ) from exc

    products: list[Product] = []
    errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1366, "height": 900})
        page = context.new_page()
        page.set_default_timeout(20_000)

        try:
            page.goto(STORE_URL, wait_until="domcontentloaded")
            human_pause()
            try:
                page.wait_for_load_state("networkidle", timeout=15_000)
            except Exception as exc:  # noqa: BLE001 - SPAs may keep connections open.
                errors.append(f"networkidle timeout: {exc}")

            products.extend(extract_visible_products(page, max_products=max_products))

            for _ in range(max(0, scroll_steps)):
                if len(products) >= max_products:
                    break
                human_pause()
                page.mouse.wheel(0, 700)
                human_pause()
                products.extend(extract_visible_products(page, max_products=max_products))
                products = dedupe_products(products)[:max_products]

        except Exception as exc:  # noqa: BLE001 - keep output useful even on failure.
            errors.append(str(exc))
        finally:
            context.close()
            browser.close()

    return {
        "source": SOURCE_NAME,
        "lastUpdated": date.today().isoformat(),
        "products": [asdict(product) for product in dedupe_products(products)[:max_products]],
        "meta": {
            "storeUrl": STORE_URL,
            "maxProducts": max_products,
            "scrollSteps": scroll_steps,
            "compliance": compliance,
            "errors": errors,
        },
    }


def write_outputs(payload: dict[str, Any], mirror_to_data: bool) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    public_payload = {
        "source": payload["source"],
        "lastUpdated": payload["lastUpdated"],
        "products": payload["products"],
    }
    OUTPUT_PATH.write_text(json.dumps(public_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    if mirror_to_data:
        APP_READY_PATH.parent.mkdir(parents=True, exist_ok=True)
        APP_READY_PATH.write_text(json.dumps(public_payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Scraper conservador para productos visibles de Carriapp.")
    parser.add_argument("--max-products", type=int, default=24, help="Máximo de productos a extraer. Default: 24.")
    parser.add_argument("--scroll-steps", type=int, default=1, help="Cantidad baja de scrolls para cargar visibles. Default: 1.")
    parser.add_argument("--headed", action="store_true", help="Muestra el navegador para depuración.")
    parser.add_argument("--preflight-only", action="store_true", help="Solo revisa robots.txt y páginas de términos.")
    parser.add_argument("--no-data-mirror", action="store_true", help="No actualiza data/prices-carriapp.json.")
    args = parser.parse_args()

    if args.max_products > 60:
        print("Por seguridad, --max-products se limita a 60 para evitar scraping masivo.", file=sys.stderr)
        args.max_products = 60

    try:
        if args.preflight_only:
            preflight_result = preflight()
            print(json.dumps(preflight_result, ensure_ascii=False, indent=2))
            payload = {"source": SOURCE_NAME, "lastUpdated": date.today().isoformat(), "products": []}
        else:
            payload = scrape(max_products=args.max_products, scroll_steps=args.scroll_steps, headless=not args.headed)
        write_outputs(payload, mirror_to_data=not args.no_data_mirror)
        print(f"Archivo generado: {OUTPUT_PATH}")
        if not args.no_data_mirror:
            print(f"Copia app-ready: {APP_READY_PATH}")
        print(f"Productos extraídos: {len(payload.get('products', []))}")
        return 0
    except (RuntimeError, URLError) as exc:
        fallback = {
            "source": SOURCE_NAME,
            "lastUpdated": date.today().isoformat(),
            "products": [],
            "meta": {"errors": [str(exc)], "compliance": preflight()},
        }
        write_outputs(fallback, mirror_to_data=not args.no_data_mirror)
        print(f"Error controlado: {exc}", file=sys.stderr)
        print(f"Se escribió salida vacía en: {OUTPUT_PATH}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
