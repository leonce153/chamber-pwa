<?php
/**
 * Lead inbox: POST JSON (or a form) here to add a lead to HQ.
 *   POST https://dashboard.chamberloop.com/lead_hook.php?key=SECRET
 *   {"name":"…","email":"…","organization":"…","phone":"…","member_count":120,"source":"website","pipeline":"chamber"}
 * The key is shown in Settings → Lead inbox. See docs/HQ.md.
 */
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/hq.php';
ensure_schema();

header('Content-Type: application/json');
header('Cache-Control: no-store');

function lead_out(int $code, array $body): void {
  http_response_code($code);
  echo json_encode($body);
  exit;
}

if (!is_file(DASH_CONFIG)) lead_out(503, ['ok' => false, 'error' => 'Dashboard is not set up yet']);
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') lead_out(204, []);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') lead_out(405, ['ok' => false, 'error' => 'POST a lead as JSON']);

$given = (string) ($_GET['key'] ?? $_SERVER['HTTP_X_LEAD_KEY'] ?? '');
try {
  $secret = lead_hook_secret();
} catch (Throwable $e) {
  lead_out(500, ['ok' => false, 'error' => 'Server error']);
}
if ($given === '' || !hash_equals($secret, $given)) lead_out(401, ['ok' => false, 'error' => 'Wrong key']);

$raw = file_get_contents('php://input', false, null, 0, 65536) ?: '';
$in = stripos($_SERVER['CONTENT_TYPE'] ?? '', 'json') !== false ? json_decode($raw, true) : $_POST;
if (!is_array($in)) lead_out(400, ['ok' => false, 'error' => 'Body must be a JSON object']);
// Some senders wrap the record: {"data": {...}} or {"lead": {...}}
foreach (['data', 'lead', 'record'] as $wrap) {
  if (isset($in[$wrap]) && is_array($in[$wrap]) && !isset($in['name']) && !isset($in['email'])) { $in = $in[$wrap]; break; }
}
// Honeypot: forms can include an empty "website_url" field that bots fill in.
if (!empty($in['website_url'])) lead_out(200, ['ok' => true]);

try {
  $id = create_lead($in, 'webhook');
  notify_new_lead($id, $in);
  lead_out(201, ['ok' => true, 'deal_id' => $id]);
} catch (InvalidArgumentException $e) {
  lead_out(422, ['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
  error_log('lead_hook: ' . $e->getMessage());
  lead_out(500, ['ok' => false, 'error' => 'Server error']);
}
