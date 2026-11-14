<?php
/**
 * JSON endpoints the Updates screen calls, one app at a time:
 *   POST api.php?a=update  {id, sha}    move the app's branch to the release and ask Hostinger to pull
 *   POST api.php?a=check   {id, short}  has the app started running that build? then apply database updates
 */

declare(strict_types=1);

require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/chambers.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(array $data, int $status = 200): void {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}

if (!is_set_up() || !current_user()) out(['error' => 'Please sign in again.'], 401);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['error' => 'Use POST'], 405);
check_csrf();

$b = json_decode((string) file_get_contents('php://input'), true) ?: [];
$app = find_app((int) ($b['id'] ?? 0));
if (!$app) out(['error' => 'App not found'], 404);
$a = (string) ($_GET['a'] ?? '');

try {
  if ($a === 'update') {
    $rel = find_release((string) ($b['sha'] ?? ''));
    if (!$rel) out(['error' => 'Release not found'], 404);
    $res = move_app_to_release($app, $rel);
    $hooked = trigger_deploy($app);
    log_activity((int) $app['id'], 'Started update to ' . $rel['short'], $rel['title'] . ($hooked ? '' : ' (deploy webhook did not answer; Hostinger will pull on its next deploy)'), true);
    out(['ok' => true, 'branch' => $res, 'hook' => $hooked, 'short' => $rel['short']]);
  }

  if ($a === 'check') {
    $want = (string) ($b['short'] ?? '');
    $h = chamber($app, 'GET', 'health', null, 10);
    $have = $h['build']['short'] ?? null;
    if ($have !== $want) out(['ok' => true, 'done' => false, 'running' => $have]);
    $m = chamber($app, 'POST', 'functions/dashboard', ['action' => 'migrate'], 60);
    $log = $m['log'] ?? [];
    log_activity((int) $app['id'], 'Now running ' . $want, $log ? 'Database: ' . implode('; ', $log) : 'No database changes needed');
    out(['ok' => true, 'done' => true, 'running' => $have, 'db' => $log]);
  }

  if ($a === 'redeploy') {
    $hooked = trigger_deploy($app);
    out(['ok' => $hooked]);
  }
} catch (Throwable $e) {
  log_activity((int) $app['id'], 'Update step failed', $e->getMessage(), false);
  out(['error' => $e->getMessage()], 502);
}

out(['error' => 'Unknown action'], 404);
