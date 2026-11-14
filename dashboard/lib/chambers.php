<?php
/**
 * Talking to the chamber apps (each one's /api with its API key) and to GitHub (releases).
 */

declare(strict_types=1);

// ---------------- app records ----------------

function all_apps(bool $withTemplate = true): array {
  $rows = db()->query('SELECT * FROM apps ORDER BY is_template DESC, position, name')->fetchAll();
  return $withTemplate ? $rows : array_values(array_filter($rows, fn($a) => !$a['is_template']));
}

function find_app(int $id): ?array {
  $st = db()->prepare('SELECT * FROM apps WHERE id = ?');
  $st->execute([$id]);
  return $st->fetch() ?: null;
}

function template_app(): ?array {
  return db()->query('SELECT * FROM apps WHERE is_template = 1 ORDER BY id LIMIT 1')->fetch() ?: null;
}

function normalize_url(string $u): string {
  $u = trim($u);
  if ($u !== '' && !preg_match('#^https?://#i', $u)) $u = 'https://' . $u;
  return rtrim($u, '/');
}

function app_host(array $app): string {
  return (string) parse_url($app['url'], PHP_URL_HOST);
}

// ---------------- chamber API ----------------

class ChamberError extends RuntimeException {}

/** Call one chamber app's API. Returns the decoded JSON ("data" unwrapped when present). */
function chamber(array $app, string $method, string $path, ?array $body = null, int $timeout = 25) {
  $key = unseal($app['api_key']);
  if (!$key) throw new ChamberError('No API key saved for this app.');
  [$status, $text] = http($method, $app['url'] . '/api/' . ltrim($path, '/'), [
    'X-Api-Key: ' . $key,
    'Accept: application/json',
    'Content-Type: application/json',
  ], $body === null ? null : json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), $timeout);
  $json = json_decode($text, true);
  if ($status === 0) throw new ChamberError('Could not reach the app: ' . $text);
  if ($status >= 400 || !is_array($json)) {
    $msg = is_array($json) ? ($json['error'] ?? $json['message'] ?? null) : null;
    throw new ChamberError(($msg ?: "The app answered with HTTP $status") . ($status === 401 ? ' (check the API key)' : ''));
  }
  if (isset($json['success']) && $json['success'] === false) throw new ChamberError((string) ($json['error'] ?? 'The app reported an error'));
  return array_key_exists('data', $json) ? $json['data'] : $json;
}

function chamber_rest(array $app, array $q) {
  return chamber($app, 'POST', 'rest', $q);
}

/** Fetch /api/site for many apps at once. @return array<int, array{ok:bool, data?:array, error?:string}> */
function fetch_summaries(array $apps): array {
  $mh = curl_multi_init();
  $handles = [];
  $out = [];
  foreach ($apps as $a) {
    $key = unseal($a['api_key']);
    if (!$key) {
      $out[$a['id']] = ['ok' => false, 'error' => 'No API key saved'];
      continue;
    }
    $ch = curl_init($a['url'] . '/api/site');
    curl_setopt_array($ch, [
      CURLOPT_HTTPHEADER => ['X-Api-Key: ' . $key, 'Accept: application/json', 'User-Agent: ChamberDashboard/' . DASH_VERSION],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 12,
      CURLOPT_CONNECTTIMEOUT => 6,
      CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
    ]);
    curl_multi_add_handle($mh, $ch);
    $handles[$a['id']] = $ch;
  }
  do {
    $st = curl_multi_exec($mh, $running);
    if ($running) curl_multi_select($mh, 1.0);
  } while ($running && $st === CURLM_OK);
  foreach ($handles as $id => $ch) {
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $json = json_decode((string) curl_multi_getcontent($ch), true);
    if ($code === 200 && is_array($json['data'] ?? null)) {
      $out[$id] = ['ok' => true, 'data' => $json['data']];
    } else {
      $err = is_array($json) ? ($json['error'] ?? null) : null;
      $out[$id] = ['ok' => false, 'error' => $err ?: ($code ? "HTTP $code" : (curl_error($ch) ?: 'Not reachable'))];
    }
    curl_multi_remove_handle($mh, $ch);
    curl_close($ch);
  }
  curl_multi_close($mh);
  return $out;
}

// ---------------- GitHub ----------------

function github_repo(): string {
  return setting('github_repo', 'leonce153/chamber-pwa') ?: 'leonce153/chamber-pwa';
}

function releases_branch(): string {
  return setting('releases_branch', 'releases') ?: 'releases';
}

function gh(string $method, string $path, ?array $body = null) {
  $token = unseal(setting('github_token'));
  if (!$token) throw new ChamberError('Add a GitHub token in Settings first.');
  [$status, $text] = http($method, 'https://api.github.com/' . ltrim($path, '/'), [
    'Authorization: Bearer ' . $token,
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28',
    'Content-Type: application/json',
  ], $body === null ? null : json_encode($body, JSON_UNESCAPED_SLASHES));
  $json = json_decode($text, true);
  if ($status === 404) return null;
  if ($status === 0 || $status >= 400) {
    $msg = is_array($json) ? ($json['message'] ?? '') : $text;
    throw new ChamberError("GitHub: $msg (HTTP $status)");
  }
  return $json;
}

/** Newest builds on the releases branch. Each: sha, short (build id), title, date. Cached for a minute. */
function list_releases(bool $fresh = false): array {
  start_session();
  if (!$fresh && isset($_SESSION['rel_cache']) && $_SESSION['rel_cache'][0] > time() - 60) return $_SESSION['rel_cache'][1];
  $repo = github_repo();
  $commits = gh('GET', "repos/$repo/commits?sha=" . rawurlencode(releases_branch()) . '&per_page=20') ?? [];
  $out = [];
  foreach ($commits as $c) {
    $msg = (string) ($c['commit']['message'] ?? '');
    $first = strtok($msg, "\n");
    if (!preg_match('/^Build ([0-9a-f]{7}):?\s*(.*)$/', $first, $m)) continue;
    $out[] = [
      'sha' => $c['sha'],
      'short' => $m[1],
      'title' => $m[2] !== '' ? $m[2] : 'Build ' . $m[1],
      'date' => $c['commit']['committer']['date'] ?? null,
    ];
  }
  $_SESSION['rel_cache'] = [time(), $out];
  return $out;
}

function find_release(string $sha): ?array {
  foreach (list_releases() as $r) if ($r['sha'] === $sha || $r['short'] === $sha) return $r;
  $c = gh('GET', 'repos/' . github_repo() . '/commits/' . rawurlencode($sha));
  if (!$c) return null;
  $first = strtok((string) $c['commit']['message'], "\n");
  if (!preg_match('/^Build ([0-9a-f]{7}):?\s*(.*)$/', $first, $m)) return null;
  return ['sha' => $c['sha'], 'short' => $m[1], 'title' => $m[2] ?: 'Build ' . $m[1], 'date' => $c['commit']['committer']['date'] ?? null];
}

/**
 * Point an app's branch at a release, always moving forward (a new commit with the release's
 * files on top of what the app has), so Hostinger's plain "git pull" picks it up, even for a rollback.
 */
function move_app_to_release(array $app, array $release): string {
  $repo = github_repo();
  $branch = $app['branch'];
  if ($branch === '') throw new ChamberError('This app has no GitHub branch set.');
  $commit = gh('GET', "repos/$repo/git/commits/" . $release['sha']);
  if (!$commit) throw new ChamberError('Release not found on GitHub.');
  $tree = $commit['tree']['sha'];

  $ref = gh('GET', "repos/$repo/git/ref/heads/" . str_replace('%2F', '/', rawurlencode($branch)));
  if (!$ref) {
    gh('POST', "repos/$repo/git/refs", ['ref' => "refs/heads/$branch", 'sha' => $release['sha']]);
    return 'created';
  }
  $head = $ref['object']['sha'];
  if ($head === $release['sha']) return 'already';
  $headCommit = gh('GET', "repos/$repo/git/commits/$head");
  if ($headCommit && $headCommit['tree']['sha'] === $tree) return 'already';

  $new = gh('POST', "repos/$repo/git/commits", [
    'message' => "Release {$release['short']}: {$release['title']}\n\nFrom {$release['sha']}",
    'tree' => $tree,
    'parents' => [$head],
  ]);
  gh('PATCH', "repos/$repo/git/refs/heads/" . str_replace('%2F', '/', rawurlencode($branch)), ['sha' => $new['sha'], 'force' => false]);
  return 'moved';
}

/** Ask Hostinger to pull the app's branch now. */
function trigger_deploy(array $app): bool {
  $hook = unseal($app['deploy_hook']);
  if (!$hook) return false;
  [$status] = http('POST', $hook, ['Content-Type: application/json'], '{}', 60);
  return $status >= 200 && $status < 300;
}

// ---------------- content copy (template) ----------------

const GROUP_LABELS = ['home' => 'Home screen', 'tabs' => 'Tabs and pages'];

/** Save what an app has now, so a copy can be undone. Returns the backup id. */
function backup_group(array $app, string $group, string $label): int {
  $data = chamber($app, 'POST', 'functions/dashboard', ['action' => 'export', 'group' => $group]);
  db()->prepare('INSERT INTO backups (app_id, grp, label, rows_json, created_at) VALUES (?,?,?,?,?)')
    ->execute([$app['id'], $group, $label, json_encode($data['rows'] ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), now()]);
  $id = (int) db()->lastInsertId();
  // keep the newest 15 per app
  $old = db()->prepare('SELECT id FROM backups WHERE app_id = ? ORDER BY id DESC LIMIT 100 OFFSET 15');
  $old->execute([$app['id']]);
  foreach ($old->fetchAll(PDO::FETCH_COLUMN) as $oid) db()->prepare('DELETE FROM backups WHERE id = ?')->execute([$oid]);
  return $id;
}

/** Copy the Home screen / tabs (or one Home section) from one app to another. */
function copy_content(array $from, array $to, string $group, ?string $sectionId = null): array {
  $export = chamber($from, 'POST', 'functions/dashboard', array_filter(['action' => 'export', 'group' => $group, 'section_id' => $sectionId]));
  $what = $sectionId ? 'one Home section' : GROUP_LABELS[$group];
  backup_group($to, $group, "Before copying $what from {$from['name']}");
  return chamber($to, 'POST', 'functions/dashboard', array_filter([
    'action' => 'import',
    'group' => $group,
    'section_id' => $sectionId,
    'rows' => $export['rows'] ?? [],
    'source_url' => $export['site_url'] ?? $from['url'],
  ]), 90);
}

function restore_backup(array $app, array $backup): array {
  backup_group($app, $backup['grp'], 'Before restoring backup #' . $backup['id']);
  return chamber($app, 'POST', 'functions/dashboard', [
    'action' => 'import',
    'group' => $backup['grp'],
    'rows' => json_decode($backup['rows_json'], true) ?: [],
    'source_url' => '',
  ], 90);
}

// ---------------- push ----------------

/** Create and send a push notification on one app. Returns recipients count when known. */
function send_push(array $app, string $title, string $body, string $url): ?int {
  $apps = chamber_rest($app, ['table' => 'apps', 'action' => 'select', 'columns' => 'id', 'limit' => 1, 'mode' => 'maybe']);
  $appId = is_array($apps) ? ($apps['id'] ?? ($apps[0]['id'] ?? null)) : null;
  if (!$appId) throw new ChamberError('This app has no app record.');
  $n = chamber_rest($app, ['table' => 'push_notifications', 'action' => 'insert', 'values' => [
    'app_id' => $appId, 'title' => $title, 'body' => $body, 'url' => $url !== '' ? $url : null, 'status' => 'draft',
  ], 'returning' => true, 'mode' => 'single']);
  $nid = $n['id'] ?? null;
  if (!$nid) throw new ChamberError('Could not create the notification.');
  $res = chamber($app, 'POST', 'functions/send-push-notification', ['notificationId' => $nid, 'title' => $title, 'body' => $body, 'url' => $url]);
  $r = is_array($res) ? ($res['gravitecResponse']['recipients'] ?? null) : null;
  return $r === null ? null : (int) $r;
}
