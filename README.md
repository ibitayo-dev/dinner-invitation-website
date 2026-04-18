# dinner-invitation-website

A private Angular 21 starter for a wedding dinner invitation site.

## What’s included

- A polished one-page invitation layout with a refined editorial feel
- Token-backed invite records with local RSVP persistence for the guest flow
- Editable sections for event details, schedule, and RSVP
- GitHub Pages-ready build settings
- An automated Pages deployment workflow

## Local development

```bash
npm install
npm start
```

Then open `http://localhost:4200/`.

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

The visual system lives in `src/app/app.scss` and `src/styles.scss`.
