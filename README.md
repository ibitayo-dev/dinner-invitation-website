# dinner-invitation-website

A private Angular 21 wedding invitation site with a same-origin Node backend, a separately inspectable Postgres database service on Railway, SQLite fallback support, and a secret admin dashboard for invite management.

## What's included

- A polished one-page invitation layout with a refined editorial feel
- Token-backed invite records with shared RSVP persistence
- A Postgres-backed invite and RSVP store for Railway, with SQLite retained for local fallback and migration
- An admin dashboard at `/admin/:guid` for creating and disabling invites
- A direct database inspector in the admin dashboard so you can see stored invite and RSVP rows inside the app
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

This app is intended to run as one web service plus one Postgres service on Railway:

1. Build command: `npm install && npm run build`
2. Start command: `npm start`
3. Add a Railway Postgres service and set `DATABASE_URL=${{Postgres.DATABASE_URL}}` on the web service

Set these environment variables in Railway:

- `ADMIN_GUID`: required secret segment for the admin route, used as `/admin/<guid>`
- `DATABASE_URL`: preferred Postgres connection string, usually referenced from the Railway Postgres service
- `DATABASE_PATH`: optional SQLite path for local fallback or one-time migration from the previous Railway volume, for example `/data/wedding.sqlite`
- `APP_ORIGIN`: optional canonical site origin used for CORS and generated links, for example `https://your-app.up.railway.app`

Notes:

- `npm start` runs the Node server in `server/wedding-backend.mjs`.
- The server serves the built Angular app from `dist/dinner-invitation-website/browser` and exposes the API on the same origin.
- When `DATABASE_URL` is present, the backend uses Postgres. When it is absent, the backend falls back to SQLite.
- On the first Postgres boot, the backend backfills from the existing SQLite file at `DATABASE_PATH` when available; otherwise it seeds from `data/wedding-data.json`.
- After verifying the Postgres data service, the old SQLite volume can be removed.

### Manual Railway CLI redeploy

Use this when you need to redeploy production manually, verify which service is linked locally, or smoke test the live app after a release.

Prerequisites:

- Railway CLI installed and authenticated
- Local checkout at the commit you want to deploy
- Linked Railway project `dinner-invitation-website`

Check the current Railway context first:

```bash
railway status
```

The repo must point at the `web` service before you trust a deploy from the current directory. If the linked service is `Postgres`, relink it explicitly:

```bash
railway link -s web -e production
```

Equivalent explicit commands:

```bash
railway service link web
railway environment link production
```

Deploy the current checkout to the production web service:

```bash
railway up --service=web --environment=production --ci
```

Check the service deployment status:

```bash
railway service status --service web --environment production --json
```

Get the live Railway hostname from service variables:

```bash
SITE_HOST="$(railway variables list --service web --environment production --kv | awk -F= '/^(RAILWAY_PUBLIC_DOMAIN|RAILWAY_SERVICE_WEB_URL)=/ { print $2; exit }')"
echo "$SITE_HOST"
```

Smoke test the deployed app:

```bash
curl -fsS "https://$SITE_HOST/api/health"
curl -I "https://$SITE_HOST/"
```

Expected checks:

- `/api/health` returns HTTP `200` with JSON including `"status":"ok"`
- The health response should report `"databaseProvider":"postgres"` in production
- `/` returns HTTP `200` with `content-type: text/html`

Observed production values during the last verified release:

- Railway service: `web`
- Railway environment: `production`
- Public hostname: `ibi-shannon.up.railway.app`

If you want to confirm the current local link after a deploy, run `railway status` again and verify it still shows service `web`.

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
- Shared persistence helpers live in `server/invite-store-shared.mjs`.
- SQLite fallback persistence lives in `server/invite-repository.mjs`.
- Postgres persistence and SQLite-to-Postgres backfill live in `server/postgres-invite-repository.mjs`.

Update those files to swap in your names, venue details, schedule, RSVP copy, and invite defaults.

## CI

The GitHub Actions workflow now runs server tests, Angular unit tests, and a production build on pushes and pull requests.

On successful pushes to `main`, and on manual workflow dispatch, the same workflow also redeploys the Railway `web` service in the `production` environment.

To enable the deploy job, add this repository secret in GitHub:

- `RAILWAY_TOKEN`: a Railway project token with deploy access to the `dinner-invitation-website` project
