# Site API (for a central dashboard)

Each chamber site has a JSON API at `https://<site>/api/`. The app's own screens use it with the
signed-in session cookie. A dashboard (for example one hosted elsewhere that manages all chambers)
uses the site's **API key** instead, which acts as an owner.

Find or replace the key at `https://<site>/install.php` → *Dashboard API key*.

```
X-Api-Key: <key>            (or)   Authorization: Bearer <key>
Content-Type: application/json
```

## Overview

`GET /api/site` → name, logo, colors, counts (Home sections, banners, notifications sent,
team members, banner views/taps), last notification, whether push is configured.

`GET /api/health` → `{ ok, installed, app, version }` (no key needed).

## Content

`POST /api/rest` with one of:

```json
{ "table": "home_sections", "action": "select", "columns": "*", "order": [["position", true]] }
{ "table": "home_banner_slides", "action": "insert", "values": { "section_id": "…", "image_url": "https://…", "alt_text": "…" }, "returning": true }
{ "table": "home_section_items", "action": "update", "values": { "label": "Events" }, "filters": [["id", "eq", "…"]] }
{ "table": "home_gallery_photos", "action": "delete", "filters": [["id", "eq", "…"]] }
```

Filters: `eq neq gt gte lt lte like ilike is in not_eq not_in not_is`. Also `limit`, `offset`,
`mode` (`many` | `single` | `maybe`), `count: "exact"`, `head: true`.

Tables: `app_settings`, `apps`, `app_features`, `feature_links`, `feature_rss_feeds`,
`feature_custom_pages`, `home_sections`, `home_section_items`, `home_banner_slides`,
`home_gallery_photos`, `home_image_cleanup`, `push_notifications`, `push_topics`, `profiles`, `app_users`,
`app_analytics`. Columns are listed in `public/server/lib/schema.php`.

## Push notifications

`POST /api/functions/send-push-notification` with an `action`:

- `{ "action": "send", "title": "…", "body": "…", "url": "https://…", "topicIds": [] }` saves and sends. Empty `topicIds` = everyone; otherwise only subscribers who follow at least one of those topics (Gravitec tags).
- `{ "action": "draft", … }` saves without sending. Pass `notificationId` to update a draft, or to send it with `send`.
- `{ "action": "test", "title", "body", "url" }` sends only to the signed-in person's own devices. Nothing is saved.
- `{ "action": "delete", "notificationId" }`
- `{ "action": "options" }` returns the topics this person may send to and `canSendToEveryone`.

Topics live in the `push_topics` table (owners edit them on the Notifications page). A sender can be limited to
certain topics (`profiles.push_topic_ids`, set with `manage-team` `set_topics`); NULL means no limit. Owners,
editors and the dashboard API key can always send to everyone. The old flow (insert a `push_notifications` row, then
call this function with its `notificationId`) still works for owners and editors and sends to everyone.

## Other functions

`POST /api/functions/<name>`:

- `manage-team` — `{ "action": "list" }`, `{ "action": "invite", "email", "role": "owner|editor|sender", "fullName" }`, `{ "action": "update_role", "userId", "role" }`, `{ "action": "remove", "userId" }`, `{ "action": "set_topics", "userId", "topicIds": [...] | null }` (senders: which topics they may send to; `null` = everyone). `invite` also takes `topicIds` for a new sender.
- `get-home-events` — `{ "section_id" }` upcoming events from an events section's feed
- `get-weather` — current weather and forecast
- `banner-stats` — `{ "kind": "tap" | "view", "ids": [...] }`
- `cleanup-home-images` — `{ "dry_run": true }`

## Images

`POST /api/storage/upload` (multipart: `bucket=home-banners`, `path=<name>.jpg`, `file`) → the image is
served at `/storage/v1/object/public/home-banners/<name>.jpg`.
