# Carriapp Scraper para IPC FOOD

Scraper conservador para obtener productos visibles desde:

```text
https://www.carriapp.cl/store
```

Este scraper no está conectado todavía con la aplicación principal. IPC FOOD sigue funcionando con sus JSON demo aunque el scraper falle.

## Alcance

El script intenta extraer productos visibles:

- nombre
- precio
- supermercado si aparece
- categoría si aparece
- imagen si aparece
- URL del producto si aparece
- fecha de extracción
- fuente: `Carriapp`

La salida se guarda en:

```text
scraping/output/carriapp_prices.json
data/prices-carriapp.json
```

## Reglas de uso responsable

- No hacer scraping masivo.
- Revisar `robots.txt` antes de ejecutar.
- Revisar páginas de términos/privacidad antes de ejecutar.
- Mantener pausas de 2 a 4 segundos entre acciones.
- Usar límites bajos de productos.
- No saltar captchas, logins ni bloqueos.

El `robots.txt` revisado al crear este prototipo respondía 200 y no declaraba rutas bloqueadas para `User-agent: *`. Aun así, vuelve a revisar antes de cada uso relevante:

```powershell
python scraping/carriapp_scraper.py --preflight-only
```

## Instalación

Desde la raíz del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r scraping/requirements.txt
playwright install chromium
```

## Ejecución

Modo conservador por defecto:

```powershell
python scraping/carriapp_scraper.py
```

Limitar aún más:

```powershell
python scraping/carriapp_scraper.py --max-products 10 --scroll-steps 0
```

Ver navegador para depuración:

```powershell
python scraping/carriapp_scraper.py --headed --max-products 10
```

Solo revisar robots y términos:

```powershell
python scraping/carriapp_scraper.py --preflight-only
```

## Formato de salida

```json
{
  "source": "Carriapp",
  "lastUpdated": "YYYY-MM-DD",
  "products": [
    {
      "id": "string",
      "name": "string",
      "price": 0,
      "store": "string",
      "category": "string",
      "imageUrl": "string",
      "productUrl": "string",
      "extractedAt": "ISO date"
    }
  ]
}
```

El preflight se imprime por consola. Los archivos JSON de salida mantienen el formato público esperado para que puedan revisarse o integrarse más adelante.
