# dinner-invitation-website

A private Angular 21 wedding invitation site with a same-origin Node backend, SQLite persistence, and a secret admin dashboard for invite management.

## What's included

- A polished one-page invitation layout with a refined editorial feel
- Token-backed invite records with shared RSVP persistence
- A SQLite-backed invite and RSVP store that works well on Railway with a mounted volume
- An admin dashboard at `/admin/:guid` for creating and disabling invites
- Separate guest and admin routes served by one Node process

## Local development

```bash
npm install
```

Run the backend and frontend separately during development:

```bash
npm run backend
npm run dev
```

Open `http://localhost:4200/`. The Angular frontend will talk to `http://localhost:3001` automatically when running on localhost.

Useful commands:

```bash
npm run test:server
npx ng test --watch=false
npm run build
```

## Railway deployment

This app is intended to run as one Railway service:

1. Build command: `npm install && npm run build`
2. Start command: `npm start`

Set these environment variables in Railway:

- `ADMIN_GUID`: required secret segment for the admin route, used as `/admin/<guid>`
- `DATABASE_PATH`: absolute path to the SQLite file on your mounted Railway volume, for example `/data/wedding.sqlite`
- `APP_ORIGIN`: optional canonical site origin used for CORS and generated links, for example `https://your-app.up.railway.app`

Notes:

- `npm start` runs the Node server in `server/wedding-backend.mjs`.
- The server serves the built Angular app from `dist/dinner-invitation-website/browser` and exposes the API on the same origin.
- The committed seed data in `data/wedding-data.json` is used only to initialize a fresh SQLite database.
- The live SQLite database file should stay on the Railway volume and is ignored by git.

## Production build

```bash
npm run build
```

The production build targets `/` and is intended to be served by the Node backend.

## Invite links

- Guest links should use `?token=<invite-token>`.
- Legacy `?name=<display name>` links still resolve for compatibility.
- Admin access lives at `/admin/<ADMIN_GUID>`.

## Editing content and behavior

- Guest-facing invitation content now lives in `src/app/invite-page/invite-page.ts`, `src/app/invite-page/invite-page.html`, and `src/app/invite-page/invite-page.scss`.
- Admin dashboard UI lives in `src/app/admin-page/admin-page.ts`, `src/app/admin-page/admin-page.html`, and `src/app/admin-page/admin-page.scss`.
- The root shell and routes live in `src/app/app.ts` and `src/app/app.config.ts`.
- Frontend API access lives in `src/app/invite-database.ts`.
- Backend routing and static asset serving live in `server/wedding-backend.mjs`.
- SQLite schema, seeding, and invite persistence live in `server/invite-repository.mjs`.

Update those files to swap in your names, venue details, schedule, RSVP copy, and invite defaults.

## CI

The GitHub Actions workflow now runs server tests, Angular unit tests, and a production build on pushes and pull requests.
