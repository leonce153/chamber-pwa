<?php
/**
 * Unsubscribe link from HQ announcement emails: unsubscribe.php?c=<contact id>&t=<token>.
 * Opening the link shows a button; the click (POST) marks the contact "do not email".
 * The two steps keep mail scanners that open links from unsubscribing people by accident.
 */
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/hq.php';
require __DIR__ . '/lib/announce.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");

$id = (int) ($_GET['c'] ?? $_POST['c'] ?? 0);
$t = (string) ($_GET['t'] ?? $_POST['t'] ?? '');
$valid = false;
$done = false;
try {
  if (!is_file(DASH_CONFIG)) throw new RuntimeException('not set up');
  ensure_schema();
  $valid = $id > 0 && hash_equals(unsub_token($id), $t) && row('contacts', $id);
  if ($valid && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    db()->prepare('UPDATE contacts SET do_not_email = 1, updated_at = ? WHERE id = ?')->execute([now(), $id]);
    db()->prepare('INSERT INTO activities (contact_id, kind, body, who, created_at) VALUES (?,?,?,?,?)')
      ->execute([$id, 'system', 'Unsubscribed from Chamber Loop announcements.', 'unsubscribe link', now()]);
    $done = true;
  }
} catch (Throwable $e) {
  error_log('unsubscribe: ' . $e->getMessage());
}
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe · Chamber Loop</title></head>
<body style="margin:0;background:#f4f6f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d2b26">
<div style="max-width:440px;margin:60px auto;padding:0 16px">
<div style="background:#fff;border:1px solid #e3e8e5;border-radius:12px;padding:28px 24px">
<?php if ($done): ?>
  <h1 style="font-size:20px;margin:0 0 10px">You're unsubscribed</h1>
  <p style="margin:0">You won't get Chamber Loop announcements anymore. If that was a mistake, reply to any of our emails or write to info@chamberloop.com.</p>
<?php elseif ($valid): ?>
  <h1 style="font-size:20px;margin:0 0 10px">Stop Chamber Loop announcements?</h1>
  <p style="margin:0 0 18px">You'll no longer get announcement emails from Chamber Loop.</p>
  <form method="post" action="unsubscribe.php">
    <input type="hidden" name="c" value="<?= (int) $id ?>"><input type="hidden" name="t" value="<?= h($t) ?>">
    <button style="background:#1f5f4a;color:#fff;border:0;border-radius:8px;padding:11px 18px;font-size:16px;cursor:pointer">Unsubscribe</button>
  </form>
<?php else: ?>
  <h1 style="font-size:20px;margin:0 0 10px">This link doesn't work</h1>
  <p style="margin:0">To stop our emails, reply to any of them with "unsubscribe" or write to info@chamberloop.com.</p>
<?php endif; ?>
</div></div></body></html>
