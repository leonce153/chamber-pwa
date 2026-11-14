<?php
/**
 * Push notifications (Gravitec) with topics.
 *
 * Subscribers pick topics in the app; each topic is a Gravitec tag on their device.
 * Owners and editors can send to everyone or to any topics. A sender can be limited to
 * certain topics on the Team page (profiles.push_topic_ids); NULL there means no limit.
 *
 * /api/functions/send-push-notification takes { action, ... }:
 *   options                      -> topics this person can see and send to
 *   send  { title, body, url, topicIds, notificationId? }   -> sends now (topicIds empty = everyone)
 *   test  { title, body, url }   -> sends only to the signed-in person's own devices, nothing saved
 *   draft { title, body, url, topicIds, notificationId? }   -> saves without sending
 *   delete { notificationId }
 */

declare(strict_types=1);

function gravitec_send(array $payload): array {
  $key = (string) config('gravitec.app_key', '');
  $secret = (string) config('gravitec.app_secret', '');
  if ($key === '' || $secret === '') {
    throw new ApiException('Push notifications are not set up yet. Add the Gravitec App Key and App Secret on the setup page.', 500);
  }
  [$status, $text] = http_request('POST', 'https://uapi.gravitec.net/api/v3/push', [
    'Content-Type: application/json',
    'Authorization: Basic ' . base64_encode("$key:$secret"),
  ], json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 20);
  $json = json_decode($text, true);
  if ($status < 200 || $status >= 300) {
    log_error("Gravitec $status: $text");
    throw new ApiException("Gravitec API error ($status): $text", 400);
  }
  return is_array($json) ? $json : ['raw' => $text];
}

function push_icon(): ?string {
  $s = db()->query('SELECT icon_url, logo_url FROM app_settings LIMIT 1')->fetch() ?: [];
  $icon = $s['icon_url'] ?? null ?: ($s['logo_url'] ?? null);
  if ($icon && str_starts_with($icon, '/')) $icon = site_url() . $icon;
  return $icon ?: null;
}

/** All topics, in order, keyed by id. */
function push_topics_all(): array {
  $out = [];
  foreach (db()->query('SELECT id, name, name_es, tag, is_visible FROM push_topics ORDER BY position, created_at')->fetchAll() as $r) {
    $out[$r['id']] = ['id' => $r['id'], 'name' => $r['name'], 'name_es' => $r['name_es'], 'tag' => $r['tag'], 'is_visible' => (bool) (int) $r['is_visible']];
  }
  return $out;
}

/** Topic ids the signed-in person may send to, or null when they may send to everyone. */
function push_allowed_topic_ids(): ?array {
  $a = actor();
  if (role_at_least('editor') || !$a['id']) return null;
  $st = db()->prepare('SELECT push_topic_ids FROM profiles WHERE id = ?');
  $st->execute([$a['id']]);
  $raw = $st->fetchColumn();
  if ($raw === false || $raw === null) return null;
  $ids = json_decode((string) $raw, true);
  return is_array($ids) ? array_values(array_filter($ids, 'is_string')) : null;
}

/** Validates the chosen topics against what this person may use. Returns [topicIds, tags]. */
function push_check_topics($raw): array {
  $ids = array_values(array_unique(array_filter(is_array($raw) ? $raw : [], 'is_string')));
  $allowed = push_allowed_topic_ids();
  if (!$ids) {
    if ($allowed !== null) fn_fail('Choose at least one topic to send to.', 403);
    return [[], []];
  }
  $topics = push_topics_all();
  $tags = [];
  foreach ($ids as $id) {
    $t = $topics[$id] ?? null;
    if (!$t) fn_fail('One of the chosen topics no longer exists. Reload the page and try again.', 400);
    if (!$t['is_visible']) fn_fail('"' . $t['name'] . '" is hidden, so nobody can follow it. Show it under Topics on the Notifications page first.', 400);
    if ($allowed !== null && !in_array($id, $allowed, true)) fn_fail('You can\'t send to "' . $t['name'] . '".', 403);
    $tags[] = $t['tag'];
  }
  return [$ids, $tags];
}

function push_payload(string $title, string $body, string $url): array {
  $redirect = ($url !== '' && $url !== 'https://' && preg_match('#^https?://#i', $url)) ? $url : site_url();
  return array_filter([
    'title' => mb_substr($title, 0, 120),
    'message' => mb_substr($body, 0, 500),
    'redirect_url' => $redirect,
    'icon' => push_icon(),
  ]);
}

function push_find(string $id): ?array {
  $st = db()->prepare('SELECT * FROM push_notifications WHERE id = ?');
  $st->execute([$id]);
  return $st->fetch() ?: null;
}

/** Senders may only change their own notifications; editors and owners any. */
function push_require_own(array $row): void {
  if (role_at_least('editor')) return;
  if (($row['sent_by'] ?? null) !== actor()['id']) fn_fail('You can only change notifications you wrote.', 403);
}

function push_app_id(): string {
  $id = db()->query('SELECT id FROM apps ORDER BY created_at LIMIT 1')->fetchColumn();
  if (!$id) fn_fail('The app record is missing. Run the setup page again.', 500);
  return (string) $id;
}

function fn_send_push(array $b): void {
  require_role('sender', 'You do not have permission to send notifications');
  $a = actor();
  $action = (string) ($b['action'] ?? '');
  if ($action === '') $action = !empty($b['testMode']) ? 'test' : 'send';

  if ($action === 'options') {
    $allowed = push_allowed_topic_ids();
    $topics = array_values(array_filter(push_topics_all(), fn($t) => $allowed === null || in_array($t['id'], $allowed, true)));
    json_out(['success' => true, 'topics' => $topics, 'canSendToEveryone' => $allowed === null, 'pushReady' => config('gravitec.app_key', '') !== '']);
  }

  $id = (string) ($b['notificationId'] ?? '');
  $existing = $id !== '' ? push_find($id) : null;
  if ($id !== '' && !$existing) fn_fail('Notification not found', 404);
  if ($existing) push_require_own($existing);

  if ($action === 'delete') {
    if (!$existing) fn_fail('notificationId is required', 400);
    db()->prepare('DELETE FROM push_notifications WHERE id = ?')->execute([$id]);
    json_out(['success' => true]);
  }

  $title = trim((string) ($b['title'] ?? ''));
  $body = trim((string) ($b['body'] ?? ''));
  $url = trim((string) ($b['url'] ?? ''));
  if ($title === '' || $body === '') fn_fail('Title and message are required', 400);
  if ($existing && $existing['status'] === 'sent') fn_fail('This notification was already sent.', 400);

  if ($action === 'test') {
    if (!$a['id']) fn_fail('Sign in as a team member to send a test.', 400);
    try {
      $res = push_deliver(['payload' => push_payload('[TEST] ' . $title, $body, $url), 'audience' => ['aliases' => [$a['id']]]], false);
    } catch (ApiException $e) {
      fn_fail($e->getMessage(), $e->status);
    }
    if (isset($res['recipients']) && (int) $res['recipients'] === 0) {
      fn_fail('Subscribe to notifications in the app first, then send a test.', 400);
    }
    json_out(['success' => true, 'message' => 'Test sent to your devices', 'gravitecResponse' => $res]);
  }

  if ($action !== 'send' && $action !== 'draft') fn_fail('Unknown action.', 400);
  [$topicIds, $tags] = push_check_topics($b['topicIds'] ?? []);

  $fields = [
    'title' => mb_substr($title, 0, 500),
    'body' => $body,
    'url' => ($url !== '' && $url !== 'https://') ? $url : null,
    'topic_ids' => json_encode($topicIds),
  ];
  if (!$existing) {
    $id = uuid4();
    db()->prepare('INSERT INTO push_notifications (id, app_id, title, body, url, icon_url, status, recipients_count, topic_ids, sent_by, sent_by_name, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      ->execute([$id, push_app_id(), $fields['title'], $fields['body'], $fields['url'], push_icon(), $action === 'draft' ? 'draft' : 'sending', 0, $fields['topic_ids'], $a['id'], $a['name'] ?: ($a['email'] ?: ($a['api'] ? 'Dashboard' : null)), now_sql()]);
  } else {
    db()->prepare('UPDATE push_notifications SET title = ?, body = ?, url = ?, topic_ids = ?, status = ? WHERE id = ?')
      ->execute([$fields['title'], $fields['body'], $fields['url'], $fields['topic_ids'], $action === 'draft' ? 'draft' : 'sending', $id]);
  }
  if ($action === 'draft') json_out(['success' => true, 'id' => $id, 'message' => 'Draft saved']);

  $payload = ['payload' => push_payload($title, $body, $url)];
  if ($tags) $payload['audience'] = ['tags' => $tags];
  try {
    $res = push_deliver($payload, (bool) $tags);
  } catch (ApiException $e) {
    db()->prepare('UPDATE push_notifications SET status = ? WHERE id = ?')->execute(['failed', $id]);
    fn_fail($e->getMessage(), $e->status);
  }
  db()->prepare('UPDATE push_notifications SET status = ?, sent_at = ?, gravitec_push_id = ?, recipients_count = ?, sent_by = ?, sent_by_name = ? WHERE id = ?')
    ->execute(['sent', now_sql(), isset($res['taskId']) ? (string) $res['taskId'] : (isset($res['id']) ? (string) $res['id'] : null), (int) ($res['recipients'] ?? 0),
      $a['id'], $a['name'] ?: ($a['email'] ?: ($a['api'] ? 'Dashboard' : null)), $id]);
  json_out(['success' => true, 'id' => $id, 'message' => 'Push notification sent successfully', 'gravitecResponse' => $res]);
}

/** Sends through Gravitec. Throws ApiException with a readable message. */
function push_deliver(array $payload, bool $toTopics): array {
  try {
    return gravitec_send($payload);
  } catch (ApiException $e) {
    $msg = $e->getMessage();
    if ($toTopics && $e->status === 400 && stripos($msg, 'tag') !== false) {
      $msg = 'Nobody follows the chosen topic yet, so there is no one to send to. ' . $msg;
    }
    throw new ApiException($msg, $e->status);
  } catch (Throwable $e) {
    throw new ApiException('Failed to connect to Gravitec push service: ' . $e->getMessage(), 502);
  }
}
