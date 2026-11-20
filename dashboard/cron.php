<?php
/**
 * Background job: refresh each chamber's status from its HQ connector.
 * Run from the command line only, every 4 hours (hPanel → Advanced → Cron Jobs):
 *   php /home/USER/domains/dashboard.chamberloop.com/public_html/cron.php
 * Chambers refreshed in the last ~4 hours (for example, opened in HQ) are skipped,
 * so each chamber gets about 6 calls a day, about 180 a month.
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/hq.php';

$force = in_array('--all', $argv ?? [], true);
$cutoff = gmdate('Y-m-d H:i:s', time() - (HQ_REFRESH_HOURS * 3600 - 10 * 60));
$done = 0; $failed = 0; $skipped = 0;
foreach (all_chambers() as $c) {
  if (!$c['connector_url'] || $c['status'] === 'paused') { $skipped++; continue; }
  if (!$force && $c['snapshot_at'] && $c['snapshot_at'] > $cutoff) { $skipped++; continue; }
  $r = refresh_chamber($c);
  if ($r['ok']) $done++; else { $failed++; fwrite(STDERR, "{$c['name']}: {$r['error']}\n"); }
}
set_setting('cron_last_run', now());
echo gmdate('c') . " refreshed $done, failed $failed, skipped $skipped\n";
