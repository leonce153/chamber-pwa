<?php
/**
 * /api/functions/<name> — server tasks the app calls (these were Supabase "edge functions").
 */

declare(strict_types=1);

require_once __DIR__ . '/events.php';
require_once __DIR__ . '/weather.php';

function functions_route(string $name): void {
  $b = json_body();
  switch ($name) {
    case 'send-push-notification': fn_send_push($b);
    case 'manage-team': fn_manage_team($b);
    case 'banner-stats': fn_banner_stats($b);
    case 'get-home-events': fn_home_events($b);
    case 'get-weather': fn_weather();
    case 'cleanup-home-images': fn_cleanup_images($b);
  }
  throw new ApiException('Unknown function', 404);
}

function fn_fail(string $error, int $status): void {
  json_out(['success' => false, 'error' => $error], $status);
}

// ===================== Push (Gravitec) =====================

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

function fn_send_push(array $b): void {
  require_role('sender', 'You do not have permission to send notifications');
  $id = (string) ($b['notificationId'] ?? '');
  $title = trim((string) ($b['title'] ?? ''));
  $body = trim((string) ($b['body'] ?? ''));
  $url = trim((string) ($b['url'] ?? ''));
  $test = !empty($b['testMode']);
  if (!$id || $title === '' || $body === '') fn_fail('notificationId, title, and body are required', 400);

  $st = db()->prepare('SELECT id FROM push_notifications WHERE id = ?');
  $st->execute([$id]);
  if (!$st->fetch()) fn_fail('Notification not found', 404);

  $redirect = ($url !== '' && $url !== 'https://' && preg_match('#^https?://#i', $url)) ? $url : site_url();
  $payload = ['payload' => array_filter([
    'title' => mb_substr($title, 0, 120),
    'message' => mb_substr($body, 0, 500),
    'redirect_url' => $redirect,
    'icon' => push_icon(),
  ])];
  if ($test) {
    $me = actor()['id'];
    if (!$me) fn_fail('Sign in as a team member to send a test.', 400);
    $payload['filter'] = ['alias' => [$me]];
  } else {
    $payload['sendToAll'] = true;
  }

  try {
    $res = gravitec_send($payload);
  } catch (ApiException $e) {
    fn_fail($e->getMessage(), $e->status);
  } catch (Throwable $e) {
    fn_fail('Failed to connect to Gravitec push service: ' . $e->getMessage(), 502);
  }
  if ($test && isset($res['recipients']) && (int) $res['recipients'] === 0) {
    fn_fail('Subscribe to notifications in the app first, then send a test.', 400);
  }
  if (!$test) {
    db()->prepare('UPDATE push_notifications SET status = ?, sent_at = ?, gravitec_push_id = ?, recipients_count = ? WHERE id = ?')
      ->execute(['sent', now_sql(), isset($res['taskId']) ? (string) $res['taskId'] : (isset($res['id']) ? (string) $res['id'] : null), (int) ($res['recipients'] ?? 0), $id]);
  }
  json_out(['success' => true, 'message' => 'Push notification sent successfully', 'gravitecResponse' => $res]);
}

// ===================== Team =====================

function fn_manage_team(array $b): void {
  require_role('owner', 'Only owners can manage the team.');
  $roles = ['owner', 'editor', 'sender'];
  $action = (string) ($b['action'] ?? '');
  $countOwners = fn() => (int) db()->query("SELECT COUNT(*) FROM profiles WHERE role = 'owner'")->fetchColumn();
  $redirectTo = isset($b['redirectTo']) && is_string($b['redirectTo']) ? $b['redirectTo'] : null;

  if ($action === 'list') {
    $rows = db()->query("SELECT p.id, p.email, p.full_name, p.role, p.created_at, u.last_sign_in_at, u.invited_at FROM profiles p JOIN auth_users u ON u.id = p.id WHERE p.role IN ('owner','editor','sender') ORDER BY p.created_at")->fetchAll();
    $members = array_map(fn($r) => [
      'id' => $r['id'], 'email' => $r['email'], 'full_name' => $r['full_name'], 'role' => $r['role'],
      'created_at' => from_sql_ts($r['created_at']), 'last_sign_in_at' => from_sql_ts($r['last_sign_in_at']),
      'invited_at' => from_sql_ts($r['invited_at']), 'pending' => !$r['last_sign_in_at'],
    ], $rows);
    json_out(['success' => true, 'members' => $members]);
  }

  if ($action === 'invite') {
    $email = strtolower(trim((string) ($b['email'] ?? '')));
    $name = trim((string) ($b['fullName'] ?? ''));
    $role = (string) ($b['role'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fn_fail('Enter a valid email address.', 400);
    if (!in_array($role, $roles, true)) fn_fail('Choose a role.', 400);

    $existing = find_user_by_email($email);
    $sendLink = true;
    if ($existing) {
      $id = $existing['id'];
      $st = db()->prepare('SELECT role FROM profiles WHERE id = ?');
      $st->execute([$id]);
      $cur = $st->fetchColumn();
      if ($cur === 'owner' && $role !== 'owner' && $countOwners() <= 1) fn_fail('There must be at least one owner.', 400);
      $sendLink = !$existing['last_sign_in_at'];
      db()->prepare('UPDATE profiles SET role = ?, is_owner = ?, full_name = COALESCE(?, full_name), updated_at = ? WHERE id = ?')
        ->execute([$role, $role === 'owner' ? 1 : 0, $name ?: null, now_sql(), $id]);
      if ($sendLink) db()->prepare('UPDATE auth_users SET invited_at = ? WHERE id = ?')->execute([now_sql(), $id]);
    } else {
      $id = create_user($email, null, $role, $name ?: null, true);
    }

    $emailSent = false;
    $inviteLink = null;
    if ($sendLink) {
      $link = link_for(create_link_token($id, 'invite', '+7 days'), 'invite', $redirectTo ?: site_url() . '/admin/accept-invite');
      $appName = app_name();
      $who = actor()['name'] ?: 'An owner';
      if (config('team_invites', 'email') === 'email') {
        $emailSent = send_mail($email, "You're invited to help manage the $appName app",
          "$who invited you to the $appName app admin.\n\nOpen this link to choose your password (it works for 7 days):\n$link\n");
      }
      if (!$emailSent) $inviteLink = $link;
    }
    json_out(['success' => true, 'emailSent' => $emailSent, 'inviteLink' => $inviteLink]);
  }

  if ($action === 'update_role') {
    $id = (string) ($b['userId'] ?? '');
    $role = (string) ($b['role'] ?? '');
    if (!in_array($role, $roles, true)) fn_fail('Choose a role.', 400);
    $st = db()->prepare('SELECT role FROM profiles WHERE id = ?');
    $st->execute([$id]);
    $cur = $st->fetchColumn();
    if ($cur === false) fn_fail('Team member not found.', 404);
    if ($cur === 'owner' && $role !== 'owner' && $countOwners() <= 1) fn_fail('There must be at least one owner.', 400);
    db()->prepare('UPDATE profiles SET role = ?, is_owner = ?, updated_at = ? WHERE id = ?')->execute([$role, $role === 'owner' ? 1 : 0, now_sql(), $id]);
    json_out(['success' => true]);
  }

  if ($action === 'remove') {
    $id = (string) ($b['userId'] ?? '');
    if ($id === actor()['id']) fn_fail("You can't remove yourself.", 400);
    $st = db()->prepare('SELECT role FROM profiles WHERE id = ?');
    $st->execute([$id]);
    $cur = $st->fetchColumn();
    if ($cur === false) fn_fail('Team member not found.', 404);
    if ($cur === 'owner' && $countOwners() <= 1) fn_fail('There must be at least one owner.', 400);
    db()->prepare('DELETE FROM auth_tokens WHERE user_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
    db()->prepare('DELETE FROM auth_users WHERE id = ?')->execute([$id]);
    json_out(['success' => true]);
  }

  fn_fail('Unknown action.', 400);
}

// ===================== Sponsor banner counters =====================

function fn_banner_stats(array $b): void {
  $kind = $b['kind'] ?? '';
  $ids = array_values(array_unique(array_filter((array) ($b['ids'] ?? []), 'is_uuid')));
  if (($kind !== 'tap' && $kind !== 'view') || !$ids) json_out(['error' => 'Invalid request'], 400);
  if ($kind === 'tap') {
    $st = db()->prepare('UPDATE home_banner_slides SET tap_count = tap_count + 1 WHERE id = ? AND is_visible = 1');
    $st->execute([$ids[0]]);
  } else {
    $ids = array_slice($ids, 0, 10);
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare("UPDATE home_banner_slides SET view_count = view_count + 1 WHERE id IN ($ph) AND is_visible = 1");
    $st->execute($ids);
  }
  json_out(['ok' => true, 'counted' => $st->rowCount()]);
}

// ===================== Events feed =====================

function fn_home_events(array $b): void {
  $id = (string) ($b['section_id'] ?? '');
  if (!is_uuid($id)) json_out(['error' => 'Invalid request'], 400);
  $st = db()->prepare('SELECT type, settings, is_visible FROM home_sections WHERE id = ?');
  $st->execute([$id]);
  $s = $st->fetch();
  if (!$s || $s['type'] !== 'events' || (!$s['is_visible'] && !role_at_least('editor'))) json_out(['events' => []], 404);
  $settings = json_decode((string) $s['settings'], true) ?: [];
  if (($settings['source'] ?? '') !== 'feed' || empty($settings['feed_url'])) json_out(['events' => []]);
  try {
    $events = feed_events((string) $settings['feed_url'], $id);
  } catch (ApiException $e) {
    json_out(['error' => $e->getMessage()], $e->status);
  }
  json_out(['events' => $events], 200, ['Cache-Control' => 'public, max-age=1800']);
}

// ===================== Weather =====================

function fn_weather(): void {
  try {
    $w = weather_get();
    json_out(['success' => true, 'weather' => $w['body']] + ($w['stale'] ? ['stale' => true] : []), 200, ['Cache-Control' => 'public, max-age=300']);
  } catch (Throwable $e) {
    log_error('weather: ' . $e->getMessage());
    json_out(['success' => false, 'error' => 'Weather is unavailable right now.'], 502);
  }
}

// ===================== Old image cleanup =====================

/** Deletes Home images that were replaced 180+ days ago and are still unused. Run daily by cron.php. */
function cleanup_home_images(bool $dryRun): array {
  $st = db()->prepare('SELECT id, storage_path FROM home_image_cleanup WHERE delete_after <= ? LIMIT 500');
  $st->execute([now_sql()]);
  $rows = $st->fetchAll();
  if (!$rows) return ['due' => 0, 'deleted' => 0, 'kept' => 0, 'dry_run' => $dryRun];
  $used = json_encode([
    db()->query('SELECT settings FROM home_sections')->fetchAll(),
    db()->query('SELECT * FROM home_section_items')->fetchAll(),
    db()->query('SELECT image_url, image_url_es FROM home_banner_slides')->fetchAll(),
    db()->query('SELECT image_url FROM home_gallery_photos')->fetchAll(),
  ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $used = str_replace('\\/', '/', $used);
  $keep = [];
  $remove = [];
  foreach ($rows as $r) {
    if (str_contains($used, '/home-banners/' . $r['storage_path']) || str_contains($used, '/home-banners/' . rawurlencode($r['storage_path']))) $keep[] = $r;
    else $remove[] = $r;
  }
  if ($dryRun) return ['due' => count($rows), 'would_delete' => count($remove), 'would_keep' => count($keep), 'dry_run' => true];
  foreach ($keep as $r) db()->prepare('UPDATE home_image_cleanup SET delete_after = ? WHERE id = ?')->execute([now_sql('+30 days'), $r['id']]);
  $deleted = 0;
  foreach ($remove as $r) {
    $file = UPLOAD_DIR . '/home-banners/' . $r['storage_path'];
    if (!str_contains($r['storage_path'], '..') && is_file($file)) @unlink($file);
    db()->prepare('DELETE FROM home_image_cleanup WHERE id = ?')->execute([$r['id']]);
    $deleted++;
  }
  return ['due' => count($rows), 'deleted' => $deleted, 'kept' => count($keep)];
}

function fn_cleanup_images(array $b): void {
  require_role('editor');
  json_out(cleanup_home_images(!empty($b['dry_run'])));
}
