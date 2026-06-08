# Architecture

IPC FOOD is a static, client-side web application. It is designed to run on GitHub Pages, Vercel, or any static hosting provider.

## Runtime Model

- No backend.
- No authentication.
- No paid APIs.
- No scraping in the main application.
- All domain content is loaded from local JSON files.

## Main Files

```text
index.html      App shell and section structure
styles.css      Responsive visual system and UI states
app.js          State, calculations, ranking logic and rendering
data/           Editable domain data
scraping/       Optional experimental scraper, not connected to the app
docs/           Project documentation
```

## Data Flow

1. `app.js` loads JSON from `data/foods.json`, `data/tips.json`, and `data/myths.json`.
2. The user enters budget, number of people, meals per day and days to cover.
3. The user selects available foods.
4. The app calculates:
   - budget per meal
   - budget per person
   - recipe estimated cost
   - food value score
   - shopping priority
5. The UI renders cards for each app section.

## Scoring

The food comparator uses a simple weighted score from 1 to 10:

- price per portion
- protein
- satiety
- processing level

The score is educational and comparative, not medical advice.

## Deployment

The app is static. Vercel should use:

- Framework preset: `Other`
- Build command: empty
- Output directory: `.`
