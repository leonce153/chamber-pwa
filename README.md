# Chamber PWA

The chamber of commerce app (installable web app with push notifications), built to run on
ordinary PHP + MySQL hosting such as Hostinger. One copy of this code serves any number of chambers;
each chamber has its own site, database, admin and Gravitec account.

- **Put it live:** [docs/HOSTINGER-SETUP.md](docs/HOSTINGER-SETUP.md)
- **Another chamber:** [docs/NEW-CHAMBER.md](docs/NEW-CHAMBER.md)
- **API for a central dashboard:** [docs/API.md](docs/API.md)

## What's in it

| Path | What it is |
|---|---|
| `src/` | The app screens (React). Public app at `/`, admin at `/admin`. Same screens as the Sticklight version. |
| `src/integrations/supabase/client.ts` | Small data client the screens use. Talks to this site's own `/api`. |
| `public/api/index.php` | The JSON API. |
| `public/server/lib/` | Server code: database rules (`rest.php`), sign-in and roles (`auth.php`), push (`functions.php`), events feed, weather, image uploads, setup/import. |
| `public/server/presets/` | Starting values per chamber for the setup page. |
| `public/install.php` | Setup page (first run) and owner-only server settings afterwards. |
| `public/index.php`, `manifest.php`, `push-worker.php` | App shell, manifest and service worker filled in with the chamber's name, icons and Gravitec key. |
| `.github/workflows/deploy.yml` | Builds on every push to `main` and publishes the result to the `deploy` branch that Hostinger pulls. |

Secrets (database password, Gravitec secret, API key) are typed on the setup page and saved only in
`data/config.php` on the server. They are never in this repository.

## Working on it locally

Needs Node 22, PHP 8.1+ (pdo_mysql, curl, gd, mbstring) and MySQL/MariaDB.

```bash
npm install
npm run build          # app + PHP into dist/
npm run php            # serves dist/ at http://127.0.0.1:8080 → open /install.php
npm run dev            # optional: live-reload screens at :5173, API forwarded to :8080
```

## Roles

Owner (everything, team, server settings) · Editor (Home screen, tabs, settings, notifications) ·
Sender (notifications only). Visitors read only what is visible on the public app.
