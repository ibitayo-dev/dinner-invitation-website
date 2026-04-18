# dinner-invitation-website

A private Angular 21 starter for a wedding dinner invitation site.

## What's included

- A polished one-page invitation layout with a refined editorial feel
- Token-backed invite records with shared RSVP persistence when the backend is configured
- Editable sections for event details, schedule, and RSVP
- GitHub Pages-ready build settings
- An automated Pages deployment workflow

## Local development

```bash
npm install
```

Run `npm run backend` in one terminal and `npm start` in another, then open `http://localhost:4200/`. The backend listens on `http://localhost:3001` by default.

The frontend will use the backend automatically on `localhost`. If you need to point the site at a deployed API, set `window.__WEDDING_API_BASE_URL__` before bootstrapping the app or replace the runtime override in `src/app/invite-database.ts`.

## Production build

```bash
npm run build:pages
```

The build is configured for the `dinner-invitation-website` GitHub Pages path.

## GitHub Pages deployment

This repo includes a workflow in `.github/workflows/deploy.yml` that publishes the app from the `main` branch.

After the first deploy, make sure GitHub Pages is set to use GitHub Actions in the repository settings.

## Editing the starter

The invitation content lives in `src/app/app.ts`, `src/app/app.html`, and `src/app/invite-database.ts`.

Update those files to swap in:

- your names
- the venue and date
- the RSVP copy, invitee greeting, and seed invite tokens

Guest links now prefer `?token=...` and fall back to `?name=...` for legacy links.

The backend lives in `server/wedding-backend.mjs` and persists shared invite/RSVP state to `data/wedding-data.json` when you run it locally or on a server.

The visual system lives in `src/app/app.scss` and `src/styles.scss`.
