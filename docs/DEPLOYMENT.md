# Deployment Guide

This guide explains how to upload IPC FOOD to GitHub and deploy it with Vercel.

## Folder to Upload

Upload the full project folder:

```text
C:\Users\mathi\OneDrive - miuandes.cl\Documentos\IPC FOOD
```

Do not upload only `index.html`; the app also needs:

```text
app.js
styles.css
data/
docs/
package.json
vercel.json
README.md
```

The `.gitignore` file excludes local preview images, ZIP files, Python caches and Vercel local metadata.

## GitHub Steps

1. Open GitHub.
2. Go to the repository `mathiasschonbornca/IPCFOOD`.
3. If the repository is empty, initialize it with the project files.
4. Upload or commit the project files from the full project folder.
5. Confirm these files exist in the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data/foods.json`
   - `data/tips.json`
   - `data/myths.json`
   - `README.md`
   - `vercel.json`

## Vercel Steps

1. Open Vercel.
2. Choose **Add New Project**.
3. Import the GitHub repository `mathiasschonbornca/IPCFOOD`.
4. Use these settings:
   - Framework Preset: `Other`
   - Build Command: leave empty
   - Output Directory: `.`
   - Install Command: leave empty
5. Click **Deploy**.

## After Deployment

Open the Vercel URL and verify:

- The home screen loads.
- Navigation tabs work.
- Food cards load from JSON.
- Myths and tips appear.
- No console errors appear for missing JSON files.
