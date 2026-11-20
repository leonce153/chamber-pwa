# Master dashboard (Chamber Loop HQ)

`dashboard/` is a small PHP site (live at **https://dashboard.chamberloop.com**) that manages every
chamber app from one login. Since version 1.1 it is **Chamber Loop HQ**: it also tracks every chamber
on the Base44 platform, works as the CRM (leads, contacts, organizations, tasks), and holds the docs
library with Ask HQ. Those parts are described in [HQ.md](HQ.md). The PWA screens below now live
under **PWAs** in the top menu:

- **Apps**: each app's status, version, banner views/taps, pushes sent and last push.
- **Open admin**: signs you straight into an app's `/admin` with a one-time link (good for 3 minutes).
- **Notifications**: send one notification to one app, several, or all of them.
- **Template**: copy the template app's Home screen, a single Home section, or its tabs to one app or
  all apps. The app's current version is backed up first; restore it from that app's page.
- **Updates**: click **Update available · update now** on an app card to move it to the newest release (you confirm first), or move one app, or all of them, to a release (or back to an older one). The app pulls it
  from GitHub, then its database updates run.
- **Activity**: everything the dashboard did, and what failed.

## How releases reach each app

```
push to main ──► GitHub Action builds ──► new commit on "releases"  ("Build abc1234: what changed")
                                               │
         Dashboard → Update (one app or many)  ▼
  app's own branch (Muleshoe: deploy, others: site/<town>) gets a commit with that release's files
                                               │
         Dashboard calls the app's Hostinger deploy webhook ──► Hostinger pulls the branch
                                               │
         Dashboard waits until /api/health shows the new build, then runs the database updates
```

Nothing reaches an app until you click Update for it. A rollback is just an update to an older
release (it is added as a new commit, so Hostinger's normal pull picks it up).

`releases` also carries `build.json` (`sha`, `short`, `message`, `built_at`), which each app reports
in `/api/health` and `/api/site`.

## What each app needs in the dashboard

| Field | Where to find it |
| --- | --- |
| App address | e.g. `https://app.muleshoetxchamber.com` |
| Dashboard API key | the app's `/install.php` → *Dashboard API key* → Show key |
| GitHub branch | the branch in the app's hPanel GIT row (`deploy` for Muleshoe, `site/<town>` for new ones) |
| Hostinger deploy webhook | hPanel → that website → Advanced → GIT → *Auto Deployment* → Webhook URL |

## The template app

The template is an ordinary chamber app (for example `template.chamberloop.com`) with its own admin.
Edit it like any chamber, then copy from it on the **Template** screen. Tick *This is the template app*
in its Connection settings. Copies keep the same ids, so copying one section again later replaces
that section on every app that already has it, and adds it where it's missing.

Copied images are downloaded from the template and saved on each app. Banner view/tap counts
start at zero. App settings (name, colors, logo, push keys) are never copied.

## The app-side API the dashboard uses

`POST /api/functions/dashboard` (API key only; a signed-in user gets 403):

- `{ "action": "login_link", "email": "…" }` → `{ url }` one-time sign-in link for that owner
  (falls back to the first owner).
- `{ "action": "migrate" }` → `{ log, build }` applies database updates.
- `{ "action": "export", "group": "home" | "tabs", "section_id"? }` → `{ rows, site_url }`
- `{ "action": "import", "group", "rows", "source_url", "section_id"? }` replaces that group (or one
  Home section) in one transaction and copies images from `source_url`.

## Setting up the dashboard site

1. hPanel: website `dashboard.chamberloop.com`, a MySQL database, and a GIT row:
   repository `git@github.com:leonce153/chamber-pwa.git`, branch **`dashboard-site`**, directory empty.
2. `data/config.php` on the server holds the database login (written by `setup.php` or placed there).
3. Open `https://dashboard.chamberloop.com/setup.php` and create your login.
4. Settings → paste a fine-grained GitHub token (only `chamber-pwa`, *Contents: Read and write*).
5. PWAs → Add an app for each chamber.
6. Settings → Ask HQ: paste an OpenAI key. Then set the 4-hour cron job shown in Settings
   (see [HQ.md](HQ.md)).

The dashboard code deploys itself: every push to `main` republishes `dashboard/` to the
`dashboard-site` branch. To have Hostinger pull it automatically, turn on Auto Deployment in hPanel →
GIT, and save its webhook URL as the GitHub repository secret `DASHBOARD_DEPLOY_HOOK`
(Settings → Secrets and variables → Actions). The build calls it once `dashboard-site` is updated.
Don't add that URL as a repository webhook too: those fire on every push, before the branch is ready. Its own database tables are created by `setup.php`; Settings →
*Apply dashboard database updates* adds new ones after a dashboard change.

Forgot the dashboard password? Click **Forgot your password?** on the sign-in page. A link good for
30 minutes is emailed (PHP `mail()`, from `info@chamberloop.com`; set `mail_from` in
`data/config.php` to change it). If the email never arrives, delete the row in the `users` table
(hPanel → phpMyAdmin) and open `/setup.php` again to make a new login.
