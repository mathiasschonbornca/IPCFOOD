# IPC FOOD

IPC FOOD is a static web application focused on food intelligence for households and people with limited budgets. It helps users compare basic foods, plan affordable meals, understand food myths and build a prioritized shopping list.

The project is designed as a production-ready static MVP: no backend, no authentication, no paid APIs and no required scraping.

## Objective

Help people, families and households eat better while spending less money.

## Core Features

- Meal planner based on budget, household size and available foods.
- Smart basic basket with price-benefit ranking.
- Food comparator with a score from 1 to 10.
- Visual evaluation states:
  - green: favorable
  - yellow: intermediate
  - red: unfavorable
- Educational cards in the "Sabias que" section.
- Food myths section with myth and reality format.
- Prioritized shopping list.
- Local JSON data files for easy editing.

## Current MVP Scope

IPC FOOD currently works as a fully static app. It uses reference data stored in local JSON files and does not require a server.

The visible price notice in the application clarifies that prices are referential for an academic prototype.

## Project Structure

```text
IPC FOOD/
  index.html
  styles.css
  app.js
  package.json
  vercel.json
  README.md
  .gitignore
  data/
    foods.json
    tips.json
    myths.json
    prices-carriapp.json
  docs/
    ARCHITECTURE.md
    DATA.md
    DEPLOYMENT.md
  scraping/
    carriapp_scraper.py
    requirements.txt
    README.md
    output/
      .gitkeep
```

## Data Files

All product, recipe, tip and myth content is loaded from JSON:

- `data/foods.json`
- `data/tips.json`
- `data/myths.json`

The file `data/prices-carriapp.json` is reserved for future Carriapp data. The main app does not depend on it yet.

## Local Development

Because the app loads JSON files, open it with a local static server instead of double-clicking `index.html`.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173
```

## Deploying to Vercel

Vercel settings:

- Framework Preset: `Other`
- Build Command: empty
- Output Directory: `.`
- Install Command: empty

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed steps.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data Documentation](docs/DATA.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Carriapp Scraper Notes](scraping/README.md)

## Limitations

- Prices are reference values only.
- Nutritional values are simplified for comparison.
- The app does not provide medical or professional nutrition advice.
- The app does not store user data.
- The main app does not use real-time supermarket data.

## Future Improvements

- Connect an external price API.
- Add more foods and recipes.
- Add weekly planning.
- Add location-based store comparisons.
- Add user preferences stored locally.
- Improve portion calculations by household profile.
