# Putting the app live on Hostinger

This is the one-time setup for **app.muleshoetxchamber.com**. It takes about 20 minutes.
For another chamber, follow the same steps with that chamber's address (see [NEW-CHAMBER.md](NEW-CHAMBER.md)).

You will do five things: add the subdomain, create a database, connect GitHub, set up Gravitec,
and run the setup page.

---

## 1. Add the subdomain

1. Log in to **hpanel.hostinger.com** → **Websites** → **Dashboard** next to *muleshoetxchamber.com*.
2. Left menu: **Domains → Subdomains**.
3. Type `app`, leave "Custom folder" unticked, click **Create**.
   The folder is shown in the list (usually `public_html/app`). Note it.
4. Left menu: **Security → SSL**. If `app.muleshoetxchamber.com` isn't listed as *Active*, click
   **Install SSL** and pick the subdomain. It can take up to 15 minutes.
5. Left menu: **Files → File Manager**. Open the subdomain folder (`public_html/app`).
   If Hostinger put a `default.php` or `index.html` there, **delete it**. The folder must be empty for step 3.

> If the main domain's DNS is managed somewhere other than Hostinger, also add a DNS record there:
> type **A**, name **app**, value = the IP shown in hPanel → **Websites → Dashboard → Website details**.

## 2. Create the database

1. Left menu: **Databases → Management**.
2. Under *Create a New MySQL Database and Database User*:
   - Database name: `chamber` (Hostinger adds a prefix, e.g. `u123456789_chamber`)
   - Username: `chamber`
   - Password: click **Generate**, then copy it somewhere safe for a minute.
3. Click **Create**. Keep this tab open; you'll paste the full database name, user and password in step 5.

## 3. Connect GitHub (auto-deploy)

The repository builds itself on GitHub. Every time code is pushed to `main`, GitHub Actions makes the
ready-to-serve files and puts them on the **`deploy`** branch. Hostinger pulls that branch.

1. Wait for the first build: open **github.com/leonce153/chamber-pwa → Actions** and check
   *Build and publish* has a green tick. (Then a `deploy` branch exists.)
2. In hPanel left menu: **Advanced → GIT**.
3. Under *Private Git Repository*, click **Generate SSH Key** and copy the key it shows.
4. In GitHub: **chamber-pwa → Settings → Deploy keys → Add deploy key**. Title `Hostinger`,
   paste the key, leave *Allow write access* **unticked**, click **Add key**.
5. Back in hPanel → **GIT** → *Create a New Repository*:
   - Repository: `git@github.com:leonce153/chamber-pwa.git`
   - Branch: `deploy`
   - Directory: `app` (the subdomain folder inside public_html, from step 1)
   Click **Create**, then click **Deploy** on the new row.
6. Turn on automatic updates: in the same row click **Auto Deployment**, copy the *Webhook URL*.
   In GitHub: **chamber-pwa → Settings → Webhooks → Add webhook**, paste it into *Payload URL*,
   content type `application/json`, *Just the push event*, **Add webhook**.

From now on, every change pushed to `main` goes live by itself within a few minutes.

## 4. Gravitec (push notifications)

Gravitec ties subscribers to a web address, so the new address needs its own Gravitec site.

1. Log in to **gravitec.net** → **Add site**. Site URL: `https://app.muleshoetxchamber.com`.
2. Choose the *custom service worker* / *manual installation* option. Set the service worker
   file to **`/push-worker.js`** and its scope to **`/`**. (The app already serves this file.)
3. Upload the Chamber logo as the notification icon.
4. Open the new site's **Settings → REST API** and keep the **App Key** and **App Secret** handy.
   You'll type them on the setup page in step 5, not in chat or email.

People who subscribed on pwa.muleshoetxchamber.com will need to allow notifications again on the new app.

## 5. Run the setup page

1. Open **https://app.muleshoetxchamber.com/install.php** (it redirects there on first visit).
2. *Start from*: **Muleshoe Chamber of Commerce (Texas)** is already picked.
3. **Database**: paste the full database name, user and password from step 2. Host stays `localhost`.
4. **Chamber**: already filled in. Check the email "from" address (e.g. `no-reply@muleshoetxchamber.com`).
5. **Push notifications**: paste the Gravitec App Key and App Secret from step 4.
6. **Owner login**: your name, `LEONCE153@gmail.com`, and a new password (10+ characters).
7. **Content**: keep **Copy everything from the old app**. To also copy hidden Home items and
   banner view/tap counts, type your old Sticklight admin email and password in the optional boxes.
8. Click **Set up the app**. You'll see *Setup complete* and what was copied.

## 6. Check it

- Open **https://app.muleshoetxchamber.com** on your phone. Home, banners, gallery, events and
  the EN/ES switch should match the old app.
- **iPhone**: Share → *Add to Home Screen*, then open it from the home screen and tap the bell to allow
  notifications. (iOS only allows web push for apps added to the home screen.)
- **Android**: tap the bell and allow, or *Install app* from the browser menu.
- Admin: **/admin** → Notify → send a **test** to yourself, then a real one.
- Server settings (Gravitec keys, email sender, dashboard API key) live at **/install.php**, owners only.

## 7. Daily cleanup (optional, recommended)

hPanel → **Advanced → Cron Jobs** → *Custom PHP*: run once a day (e.g. 3:00) the file
`public_html/app/server/cron.php`. It removes Home images that were replaced more than 180 days ago.

## If something goes wrong

| Problem | Fix |
|---|---|
| Setup page says it can't connect to the database | Re-copy the full name/user with the `u123…_` prefix; reset the DB password in hPanel. |
| Blank page or "files are missing" | hPanel → GIT → **Deploy** again; check the Actions build on GitHub is green. |
| "Push notifications are not set up yet" | Add the Gravitec App Key and Secret at /install.php. |
| Invite/reset emails don't arrive | Create the `no-reply@` mailbox in hPanel → Emails, or switch *Team invites* to "Show a link to copy" at /install.php. |
| Errors in the admin | The server log is in `app/data/error.log` (File Manager). |
