<?php
/**
 * JSON API for the chamber app. All /api/* requests land here (see /.htaccess).
 *
 *   GET  /api/health                 is the site set up and reachable
 *   GET  /api/site                   summary for a central dashboard (owner or API key)
 *   POST /api/rest                   table reads/writes (see server/lib/rest.php)
 *   GET  /api/auth/me, POST /api/auth/{login,logout,verify,recover,update}
 *   POST /api/storage/{upload,remove,list}
 *   POST /api/functions/{send-push-notification,manage-team,banner-stats,get-home-events,get-weather,cleanup-home-images,dashboard}
 *
 * Browsers use the session cookie. A central dashboard sends "X-Api-Key: <api_key from setup>".
 */

declare(strict_types=1);

require_once __DIR__ . '/../server/lib/bootstrap.php';
require_once __DIR__ . '/../server/lib/auth.php';
require_once __DIR__ . '/../server/lib/rest.php';
require_once __DIR__ . '/../server/lib/storage.php';
require_once __DIR__ . '/../server/lib/functions.php';
require_once __DIR__ . '/../server/lib/dashboard.php';

header('Cache-Control: no-store');
header('Referrer-Policy: same-origin');

$path = $_GET['_path'] ?? (string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$path = trim(preg_replace('#^/?api/?#', '', '/' . ltrim($path, '/')), '/');
$parts = $path === '' ? [] : explode('/', $path);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Cross-site pages may not drive this API with someone's cookie: browser writes must come from this site.
if ($method === 'OPTIONS') {
  http_response_code(204);
  exit;
}

try {
  if (!is_installed()) {
    if (($parts[0] ?? '') === 'health') json_out(['ok' => false, 'installed' => false]);
    throw new ApiException('This app is not set up yet. Open /install.php to finish setup.', 503);
  }

  if ($method === 'POST' && !api_key_from_request()) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin && parse_url($origin, PHP_URL_HOST) !== explode(':', $host)[0] && rtrim($origin, '/') !== rtrim(site_url(), '/')) {
      throw new ApiException('Cross-site request blocked', 403);
    }
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === '') throw new ApiException('Missing request header', 400);
  }

  switch ($parts[0] ?? '') {
    case 'health':
      db()->query('SELECT 1');
      json_out(['ok' => true, 'installed' => true, 'app' => app_name(), 'version' => APP_VERSION, 'build' => build_info()]);
    case 'site':
      require_role('owner');
      json_out(['data' => site_summary()]);
    case 'rest':
      if ($method !== 'POST') throw new ApiException('Use POST', 405);
      rest_route();
    case 'auth':
      auth_route($parts[1] ?? '');
    case 'storage':
      if ($method !== 'POST') throw new ApiException('Use POST', 405);
      storage_route($parts[1] ?? '');
    case 'functions':
      if ($method !== 'POST') throw new ApiException('Use POST', 405);
      functions_route($parts[1] ?? '');
  }
  throw new ApiException('Not found', 404);
} catch (ApiException $e) {
  json_out(['data' => null, 'success' => false, 'error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
  log_error(get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  json_out(['data' => null, 'success' => false, 'error' => 'Something went wrong on the server. Please try again.'], 500);
}

/** One-call overview a central dashboard can show for each chamber site. */
function site_summary(): array {
  $s = db()->query('SELECT app_name, short_name, logo_url, icon_url, primary_color, status, updated_at FROM app_settings LIMIT 1')->fetch() ?: [];
  $q = fn(string $sql) => (int) db()->query($sql)->fetchColumn();
  $last = db()->query("SELECT title, sent_at, recipients_count FROM push_notifications WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 1")->fetch() ?: null;
  return [
    'site_url' => site_url(),
    'app' => $s ? array_merge($s, ['updated_at' => from_sql_ts($s['updated_at'] ?? null)]) : null,
    'counts' => [
      'home_sections' => $q('SELECT COUNT(*) FROM home_sections'),
      'banner_slides' => $q('SELECT COUNT(*) FROM home_banner_slides'),
      'notifications_sent' => $q("SELECT COUNT(*) FROM push_notifications WHERE status = 'sent'"),
      'team_members' => $q("SELECT COUNT(*) FROM profiles WHERE role IN ('owner','editor','sender')"),
      'banner_views' => $q('SELECT COALESCE(SUM(view_count),0) FROM home_banner_slides'),
      'banner_taps' => $q('SELECT COALESCE(SUM(tap_count),0) FROM home_banner_slides'),
    ],
    'last_notification' => $last ? ['title' => $last['title'], 'sent_at' => from_sql_ts($last['sent_at']), 'recipients' => (int) $last['recipients_count']] : null,
    'push_configured' => (bool) config('gravitec.app_key') && (bool) config('gravitec.app_secret'),
    'version' => APP_VERSION,
    'build' => build_info(),
  ];
}
