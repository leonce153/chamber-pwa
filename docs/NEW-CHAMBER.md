# Setting up another chamber

Every chamber gets its own website folder, database, Gravitec site and admin, all from this same code.
Nothing is shared between chambers.

1. **Optional preset.** Copy `public/server/presets/blank.json` to `public/server/presets/<town>.json`
   and fill in the name, address, time zone, weather coordinates (lat/lon from Google Maps) and
   email sender. Put the chamber's logo next to it (e.g. `<town>-icon.png`, square PNG, 512px+) and set
   `"icon_url": "preset:<town>-icon.png"`. Commit and push to `main`. (You can also skip this and type
   everything on the setup page.)
2. Follow [HOSTINGER-SETUP.md](HOSTINGER-SETUP.md) with the new chamber's domain:
   new subdomain (or domain), **new database**, a new GIT row pointing at the chamber's own branch
   `site/<town>` and that site's folder, and a **new Gravitec site**. Add the app in the master
   dashboard (with that branch and the GIT row's webhook URL) and click Update once to give it the
   newest release.
3. On `/install.php` pick the preset, choose **Start with a fresh starter Home screen**, and create
   the chamber's owner login.
4. In `/admin`: Settings (name, colors, logo, chamber website), Home screen (sections, buttons,
   banners), Build (tabs). Then Server settings → **Rebuild app icons** if you changed the logo.

A fix pushed to `main` becomes a release. It reaches a chamber when you click **Update** for it (or
for all apps) on the dashboard's Updates screen, which also applies database updates. To give a new
chamber the template's Home screen and tabs, use the dashboard's **Template** screen.

Things that are still Muleshoe-flavored in the code and worth changing per chamber when needed:
the "Ask the Mule" assistant wording and avatar, and the default footer text.
