<?php
/**
 * Daily housekeeping. Add in Hostinger → Advanced → Cron Jobs (once a day, e.g. 3 AM):
 *   php /home/<user>/domains/<domain>/public_html/<app folder>/server/cron.php
 * Deletes Home images replaced 180+ days ago that are no longer used, and old login attempts.
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/rest.php';
require_once __DIR__ . '/lib/functions.php';
if (!is_installed()) { fwrite(STDERR, "Not set up yet\n"); exit(1); }
$dry = in_array('--dry-run', $argv, true);
echo json_encode(cleanup_home_images($dry)), "\n";
db()->prepare('DELETE FROM login_attempts WHERE created_at < ?')->execute([now_sql('-1 day')]);
db()->prepare('DELETE FROM auth_tokens WHERE expires_at < ?')->execute([now_sql('-30 days')]);
