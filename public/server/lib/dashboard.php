<?php
/**
 * /api/functions/dashboard — tasks only the master dashboard can run (it sends this site's API key).
 *
 *   { "action": "login_link", "email": "…" }        one-time link that signs the owner into /admin
 *   { "action": "migrate" }                          apply database updates after a new release
 *   { "action": "export", "group": "home"|"tabs", "section_id"?: "…" }
 *   { "action": "import", "group": "home"|"tabs", "rows": {table: [rows]}, "source_url": "https://…",
 *     "section_id"?: "…" }                           replace this site's Home screen / tabs (or one section)
 */

declare(strict_types=1);

require_once __DIR__ . '/setup.php';

const DASHBOARD_GROUPS = [
  // parent table first; children reference it
  'home' => ['home_sections', 'home_section_items', 'home_banner_slides', 'home_gallery_photos'],
  'tabs' => ['app_features', 'feature_links', 'feature_rss_feeds', 'feature_custom_pages'],
];

/** The build this site is running (written by the GitHub Action into build.json). */
function build_info(): ?array {
  $f = APP_ROOT . '/build.json';
  if (!is_file($f)) return null;
  $j = json_decode((string) file_get_contents($f), true);
  return is_array($j) ? $j : null;
}

function fn_dashboard(array $b): void {
  if (!actor()['api']) throw new ApiException('Only the dashboard can do that.', 403);
  $action = (string) ($b['action'] ?? '');

  if ($action === 'login_link') {
    $email = trim((string) ($b['email'] ?? ''));
    $st = db()->prepare("SELECT p.id FROM profiles p JOIN auth_users u ON u.id = p.id WHERE p.role = 'owner' AND LOWER(u.email) = LOWER(?) LIMIT 1");
    $st->execute([$email]);
    $uid = $st->fetchColumn();
    if (!$uid) {
      $uid = db()->query("SELECT p.id FROM profiles p JOIN auth_users u ON u.id = p.id WHERE p.role = 'owner' ORDER BY p.created_at LIMIT 1")->fetchColumn();
    }
    if (!$uid) throw new ApiException('This app has no owner account yet.', 404);
    $token = create_link_token((string) $uid, 'magiclink', '+3 minutes');
    json_out(['data' => ['url' => site_url() . '/admin#access_token=' . rawurlencode($token) . '&type=dashboard']]);
  }

  if ($action === 'migrate') {
    json_out(['data' => ['log' => migrate(db()), 'build' => build_info()]]);
  }

  $group = (string) ($b['group'] ?? '');
  if (!isset(DASHBOARD_GROUPS[$group])) throw new ApiException('Unknown group', 400);
  $tables = DASHBOARD_GROUPS[$group];
  $sectionId = isset($b['section_id']) && $b['section_id'] !== '' ? (string) $b['section_id'] : null;
  if ($sectionId !== null && ($group !== 'home' || !is_uuid($sectionId))) throw new ApiException('Invalid section', 400);

  if ($action === 'export') {
    $out = [];
    foreach ($tables as $t) {
      if ($sectionId === null) {
        $out[$t] = db()->query("SELECT * FROM `$t`")->fetchAll();
      } else {
        $col = $t === 'home_sections' ? 'id' : 'section_id';
        $st = db()->prepare("SELECT * FROM `$t` WHERE `$col` = ?");
        $st->execute([$sectionId]);
        $out[$t] = $st->fetchAll();
      }
    }
    json_out(['data' => ['rows' => $out, 'site_url' => site_url()]]);
  }

  if ($action === 'import') {
    $rows = is_array($b['rows'] ?? null) ? $b['rows'] : [];
    $source = rtrim((string) ($b['source_url'] ?? ''), '/');
    if ($source !== '' && !preg_match('#^(https://[a-z0-9.-]+|http://(127\.0\.0\.1|localhost)(:\d+)?)$#i', $source)) throw new ApiException('Invalid source address', 400);
    $appId = db()->query('SELECT id FROM apps ORDER BY created_at LIMIT 1')->fetchColumn();
    if ($group === 'tabs' && !$appId) throw new ApiException('This app has no app record.', 500);

    $images = 0;
    $pdo = db();
    $pdo->beginTransaction();
    try {
      // Clear what is being replaced (children first)
      foreach (array_reverse($tables) as $t) {
        if ($sectionId === null) {
          $pdo->exec("DELETE FROM `$t`");
        } else {
          $col = $t === 'home_sections' ? 'id' : 'section_id';
          $pdo->prepare("DELETE FROM `$t` WHERE `$col` = ?")->execute([$sectionId]);
        }
      }
      $counts = [];
      foreach ($tables as $t) {
        $counts[$t] = 0;
        foreach ((array) ($rows[$t] ?? []) as $r) {
          if (!is_array($r) || !is_uuid($r['id'] ?? null)) continue;
          if ($sectionId !== null && ($t === 'home_sections' ? $r['id'] : ($r['section_id'] ?? '')) !== $sectionId) continue;
          $vals = [];
          foreach (SCHEMA[$t] as $c => $spec) {
            if (!array_key_exists($c, $r)) continue;
            $v = $r[$c];
            if (is_string($v) && $source !== '') $v = dashboard_copy_image($v, $source, $images);
            $vals[$c] = $v;
          }
          if ($t === 'app_features') $vals['app_id'] = $appId;
          foreach (['tap_count', 'view_count'] as $c) if (isset(SCHEMA[$t][$c])) $vals[$c] = 0;
          foreach (['updated_by', 'updated_by_name'] as $c) if (isset(SCHEMA[$t][$c])) $vals[$c] = null;
          dashboard_insert_raw($t, $vals);
          $counts[$t]++;
        }
      }
      $pdo->commit();
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
    json_out(['data' => ['counts' => $counts, 'images_copied' => $images]]);
  }

  throw new ApiException('Unknown action', 400);
}

/** Insert a row exported from another site's database (values are already in database form). */
function dashboard_insert_raw(string $table, array $vals): void {
  $row = [];
  foreach (SCHEMA[$table] as $c => $spec) {
    $row[$c] = array_key_exists($c, $vals) ? $vals[$c] : rest_default($spec);
    if ($row[$c] === null && !$spec[2]) $row[$c] = rest_default($spec);
    if (is_bool($row[$c])) $row[$c] = $row[$c] ? 1 : 0;
    if (is_array($row[$c])) $row[$c] = json_encode($row[$c], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  }
  $cols = array_keys($row);
  db()->prepare("INSERT INTO `$table` (" . implode(',', array_map(fn($c) => "`$c`", $cols)) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')
    ->execute(array_values($row));
}

/**
 * Images uploaded on the source site live at <source>/storage/v1/object/public/<bucket>/<file>.
 * Copy each one here and point the value at this site's copy. Works inside JSON text too.
 */
function dashboard_copy_image(string $value, string $source, int &$count): string {
  if (!str_contains($value, '/storage/v1/object/public/')) return $value;
  $re = '#(' . preg_quote($source, '#') . ')?/storage/v1/object/public/([a-z0-9-]+)/([A-Za-z0-9._\-/ %]+?\.(?:jpe?g|png|webp|gif))#i';
  return (string) preg_replace_callback($re, function ($m) use ($source, &$count) {
    $bucket = $m[2];
    $path = rawurldecode($m[3]);
    try {
      $dir = bucket_dir($bucket);
      $path = safe_object_path($path);
    } catch (Throwable $e) {
      return $m[0];
    }
    $target = $dir . '/' . $path;
    if (!is_file($target)) {
      [$status, $data] = http_request('GET', $source . '/storage/v1/object/public/' . $bucket . '/' . str_replace('%2F', '/', rawurlencode($path)), [], null, 20, 8000000);
      if ($status !== 200 || $data === '' || @getimagesizefromstring($data) === false) return $m[0];
      if (!is_dir(dirname($target))) @mkdir(dirname($target), 0755, true);
      if (@file_put_contents($target, $data) === false) return $m[0];
      @chmod($target, 0644);
      $count++;
    }
    return site_url() . '/storage/v1/object/public/' . $bucket . '/' . $path;
  }, $value);
}
