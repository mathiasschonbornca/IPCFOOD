# Data Documentation

IPC FOOD uses local JSON files for all editable content.

## Files

```text
data/foods.json
data/tips.json
data/myths.json
data/prices-carriapp.json
```

## foods.json

Contains:

- food items
- reference prices
- nutrition comparison fields
- simple recipe definitions

Important fields:

```json
{
  "id": "arroz",
  "name": "Arroz",
  "avgPrice": 1290,
  "protein": 7,
  "calories": 360,
  "portions": 10,
  "satiety": 3,
  "processing": 1
}
```

## tips.json

Contains short educational cards for:

- nutrition
- savings
- shopping
- cooking
- conservation

## myths.json

Contains food myths in the format:

```json
{
  "myth": "The myth text",
  "reality": "The explanation"
}
```

## prices-carriapp.json

Reserved for future Carriapp scraper output. The main app does not depend on this file yet.
