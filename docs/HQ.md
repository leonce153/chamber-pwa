# Chamber Loop HQ

HQ is the admin dashboard and CRM for all of Chamber Loop. It is the same PHP site as the PWA master
dashboard ([DASHBOARD.md](DASHBOARD.md)), at **https://dashboard.chamberloop.com**, so it runs on
Hostinger with no Base44 credits. It replaces the Base44 "ChamberLoop Setup Manager".

## Screens

Every screen is in the left sidebar (`hq_menu()` in `dashboard/lib/core.php`). A group opens to show its pages, and the group holding the page you are on starts open. On a phone the sidebar opens from the **Menu** button.

| Menu | What it does |
| --- | --- |
| **Home** | Today: tasks and follow-ups due, new leads, chambers that need attention, monthly revenue. Chamber cards on top, PWA cards below. |
| **Chambers** | One card per chamber on the platform: status (onboarding, live, grace, paused), plan and price, sponsor, member count, links to the site, admin and Base44 editor, and live numbers from its HQ connector. |
| **PWAs** | The original dashboard: Apps, Updates, Notifications, Template (see DASHBOARD.md). |
| **Leads** | Two pipelines, **Chambers** and **Sponsors**, as a board or a list. Each lead has a next step and due date, notes and history, and can become a chamber card when won. |
| **Contacts** | People and organizations (chambers, sponsors, partners, vendors). |
| **Tasks** | Your to-do list, linked to a lead, contact, organization or chamber. |
| **Docs** | The how-to library (Cloudflare, inbound email, Amazon SES, Base44, Hostinger, Stripe…), written in Markdown. |
| **Ask HQ** | Ask a question; HQ finds the matching docs and answers with OpenAI, citing them. A good answer can be saved as a new doc. |
| **New chamber setup** | Chambers → New chamber setup. The step-by-step checklist to follow after duplicating a chamber app: create the app, email, AI, website, features, optional services, HQ and phone app, launch. Tick steps per chamber (or mark them Not needed); progress shows on each chamber's page. Edit steps right on the page (Edit steps: change wording, reorder, add, remove, rename or reorder phases); they are stored in the `setup_steps` table. `SETUP_DEFAULT_PHASES` in `dashboard/lib/setup.php` only fills that table the first time. |
| **Mind maps** | Visual maps of how each kind of user moves through Chamber Loop, with a left sidebar: Chamber managers (built), Business owners and Super admin (coming). Click a box to open its branch and see what it is for. |
| **Activity** | What the dashboard did to the PWAs. CRM history is on each record. |
| **Settings** | GitHub, OpenAI key and model, lead inbox address, cron command, password. |

Plans and prices (`HQ_PLANS` in `lib/hq.php`): founding sponsor $99/mo (locked, no step-up),
sponsor 150–499 members $150, sponsor 500+ $250, direct $49, free Lite (no AI) $0, demo. A chamber
in **grace** has a sponsor leaving; set its grace end date (60 days) and the card counts it down.

## The HQ connector (one per Base44 chamber app)

Each chamber's Base44 app gets one backend function, `hqConnector`, that HQ calls to read its
status. It is read-only and checks a shared secret.

- **Request:** `POST <function URL>`, header `X-HQ-Key: <secret>`, body `{"action":"snapshot"}`
- **Secret:** a random string saved as the app secret `HQ_CONNECTOR_KEY` and pasted into the chamber
  card in HQ (stored encrypted). Use a different one for each chamber.
- **New chambers:** the ChamberLoop Core Template already has `hqConnector` (v3), so a new chamber
  app made from it has the function too. To connect a new chamber: set the app secret
  `HQ_CONNECTOR_KEY` (for example `openssl rand -hex 24`), then in HQ add the chamber with
  `https://<app>.base44.app/functions/hqConnector` and the same key. Until the secret is set,
  every call is refused.
- **Answer:**

```json
{
  "ok": true,
  "chamber": { "name": "Muleshoe Chamber of Commerce", "logo_url": "https://…" },
  "counts": {
    "members": 120, "users": 45, "logins_30d": 30, "open_tickets": 1,
    "pending_approvals": 2, "ai_requests_month": 410
  },
  "health": {
    "inbound_email": "ok",
    "scheduled_jobs_last_run": "2026-11-20T12:00:00Z",
    "email_bounces_30d": 0
  },
  "flags": ["Anything else HQ should show on the card"],
  "version": "core-2026.11"
}
```

Any field can be left out. A wrong key must answer `401 {"ok":false,"error":"…"}`. HQ shows
warnings on the card for open tickets, approvals waiting, `inbound_email: "error"`, scheduled jobs
not run in 24 hours, a connector that fails, and each string in `flags`.

**How often:** the cron job checks each chamber every 4 hours (about 180 calls a month per
chamber), and opening a chamber in HQ refreshes it if the last check is over 10 minutes old. The
Refresh button checks it now.

Order of rollout: Willow Hills (demo), then Sudan 365, then Muleshoe (live).

## Cron job

hPanel → Advanced → Cron Jobs, every 4 hours (`0 */4 * * *`):

```
php /home/USER/domains/dashboard.chamberloop.com/public_html/cron.php
```

Settings shows the exact path. `cron.php` only runs from the command line, skips paused chambers and
any chamber checked in the last ~4 hours. `php cron.php --all` checks every chamber now.

## Lead inbox (webhook)

Anything that can send a web request (the chamberloop.com demo and contact forms, NotiQ, Zapier)
can add a lead:

```
POST https://dashboard.chamberloop.com/lead_hook.php?key=SECRET
Content-Type: application/json

{
  "name": "Pat Doe", "email": "pat@example.com", "organization": "Lubbock Chamber",
  "phone": "806…", "role": "Director", "member_count": 320,
  "interests": ["AI concierge"], "notes": "…", "source": "chamberloop.com demo",
  "pipeline": "chamber"
}
```

- The key is in Settings → Lead inbox (also accepted as an `X-Lead-Key` header). Make a new one there
  if it leaks. Call it from a server (a Base44 backend function), never from browser code, so the
  key stays private.
- `pipeline` is `chamber` (default) or `sponsor`. A body wrapped as `{"data":{…}}` also works.
- HQ finds or creates the organization and contact (matched by name and email), opens a lead in
  **New** with "Reply to the new lead" due tomorrow, and logs the details as a note.
- Answers `201 {"ok":true,"deal_id":12}`; `401` wrong key; `422` no name, email or organization.
- Each new lead from the inbox also emails a short note (with Reply-To set to the lead) to info@chamberloop.com, or to the `lead_notify_email` setting if set.
- `member_count` can be a number or text such as "100–249" or "1,000 or more"; HQ keeps the first number.

**chamberloop.com is connected.** The marketing site (Base44 app "Chamber Loop") has a backend function
`forwardLeadToHQ` and two workflows, "Send Demo Request to HQ" and "Send Contact Message to HQ", that
run when a DemoRequest or ContactInquiry is created. The function reads the stored record, posts it here
with the `HQ_LEAD_KEY` secret (set in that app's secrets), and stamps `hq_forwarded_at` so each one is
sent once. If you make a new lead key in HQ, update `HQ_LEAD_KEY` there too.

## Setup Manager (retired)

The old Base44 "ChamberLoop Setup Manager" was imported once on Nov 20, 2026: Sudan 365's details,
contact and launch checklist (as tasks), plus its setup record and the core template release history
as docs in the **Setup Manager** folder. The one-time importer was then removed.

## Announcements (email)

**Announcements** in the menu sends an email to a group of CRM contacts: chamber customers,
prospect chambers, sponsors, everyone, or the contacts of the chambers you tick.

- Sent from info@chamberloop.com, one email per person, HTML plus plain text, through the mailbox
  (see Email sending below). Up to 250 people per send because Hostinger limits outgoing mail per hour.
- Write the message in simple Markdown. "Save and preview" shows it; "Send a test to me" sends it
  only to your own login email.
- Every email has a personal unsubscribe link (`unsubscribe.php`, signed with the config secret) and a
  `List-Unsubscribe` header. Clicking Unsubscribe marks the contact **do not email**, and HQ never
  sends announcements to those contacts.
- Each send is kept in the history, and each person gets an "Announcement sent" note on their contact.

## Email sending (SMTP)

Settings → **Email sending** makes HQ send all its email (announcements, new-lead alerts, password
resets) through the info@chamberloop.com mailbox at smtp.hostinger.com (port 465, SSL), signed in
with the mailbox password. Mail sent that way carries the domain's DKIM signature and passes SPF, so
it lands in inboxes instead of spam.

- Paste the mailbox password and click **Save and send a test**. The password is stored encrypted
  (sealed with the config secret) and is never shown again. A test email goes to your login email.
- The card shows **On** when a password is saved, and the last test error if one failed.
- **Remove password** turns it off. HQ then falls back to PHP `mail()`, which tends to land in spam.
- Server and port are under "Server settings" (465 SSL or 587 STARTTLS) in case Hostinger changes them.

## Ask HQ

Settings → Ask HQ: paste an OpenAI API key (stored encrypted) and pick a model (default
`gpt-4o-mini`). Questions search the docs with MySQL full-text search, send the best matches to
OpenAI, and the answer cites docs as `[#id]`. Questions and answers are kept in `ask_log`.

## Database

New tables (created by Settings → *Apply dashboard database updates*): `chambers`, `orgs`,
`contacts`, `deals`, `activities`, `tasks`, `docs`, `ask_log`. Existing PWA tables are unchanged.

## Coming next

Two-step sign-in; Stripe billing (test mode first); AI
cost per chamber from the OpenAI admin key; reports.

## Mind maps

Each map is a JSON file in `dashboard/lib/mindmaps/` (`chamber-managers.json`, and later
`business-owners.json` and `super-admin.json`). The list in the sidebar is `MINDMAPS` in
`dashboard/lib/mindmaps.php`; a map with no file yet shows as "coming soon". `lib/` is blocked from
the web, so the maps are only seen after signing in.

A node is `{ "label", "path"?, "desc"?, "status"?, "kind"?, "children"? }`. `status` is a key of the
map's `statusLabels` (for example `off` = off for Muleshoe, `super` = super admin only); `kind: "tab"`
draws a tab inside a page. When a feature is added, add its node and bump `updated`.
