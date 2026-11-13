<?php
/**
 * Database setup: create/upgrade tables from SCHEMA, seed a fresh chamber, and import
 * content from the old Sticklight/Supabase app.
 */

declare(strict_types=1);

require_once __DIR__ . '/brand.php';

/** Creates missing tables and adds missing columns. Safe to run again after every update. */
function migrate(PDO $pdo): array {
  $log = [];
  foreach (SCHEMA as $table => $cols) {
    $exists = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table))->fetchColumn();
    if (!$exists) {
      $defs = [];
      foreach ($cols as $c => [$type, $def, $nullable]) {
        $defs[] = "`$c` " . schema_sql_type($type) . ($nullable ? ' NULL' : ' NOT NULL');
      }
      $defs[] = 'PRIMARY KEY (`id`)';
      foreach (SCHEMA_INDEXES[$table] ?? [] as [$name, $icols, $unique]) {
        $defs[] = ($unique ? 'UNIQUE KEY' : 'KEY') . " `$name` (" . implode(',', array_map(fn($c) => "`$c`", $icols)) . ')';
      }
      $pdo->exec("CREATE TABLE `$table` (\n  " . implode(",\n  ", $defs) . "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      $log[] = "Created table $table";
      continue;
    }
    $have = [];
    foreach ($pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll() as $r) $have[$r['Field']] = true;
    foreach ($cols as $c => [$type, $def, $nullable]) {
      if (isset($have[$c])) continue;
      $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$c` " . schema_sql_type($type) . ' NULL');
      $fill = rest_default([$type, $def, $nullable]);
      if ($fill !== null) $pdo->prepare("UPDATE `$table` SET `$c` = ?")->execute([$fill]);
      if (!$nullable) $pdo->exec("ALTER TABLE `$table` MODIFY `$c` " . schema_sql_type($type) . ' NOT NULL');
      $log[] = "Added column $table.$c";
    }
    $idx = [];
    foreach ($pdo->query("SHOW INDEX FROM `$table`")->fetchAll() as $r) $idx[$r['Key_name']] = true;
    foreach (SCHEMA_INDEXES[$table] ?? [] as [$name, $icols, $unique]) {
      if (isset($idx[$name])) continue;
      $pdo->exec("ALTER TABLE `$table` ADD " . ($unique ? 'UNIQUE KEY' : 'KEY') . " `$name` (" . implode(',', array_map(fn($c) => "`$c`", $icols)) . ')');
      $log[] = "Added index $name";
    }
  }
  return $log;
}

/** Insert one row using SCHEMA defaults for anything not given. */
function seed_insert(string $table, array $vals): string {
  $row = [];
  foreach (SCHEMA[$table] as $c => $spec) {
    $row[$c] = array_key_exists($c, $vals) ? rest_to_db($spec[0], $vals[$c]) : rest_default($spec);
    if ($row[$c] === null && !$spec[2]) $row[$c] = rest_default($spec);
  }
  $cols = array_keys($row);
  db()->prepare("INSERT INTO `$table` (" . implode(',', array_map(fn($c) => "`$c`", $cols)) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')
    ->execute(array_values($row));
  return $row['id'];
}

/** A fresh chamber: settings, the app record, default tabs and a starter Home screen. */
function seed_fresh(array $p): void {
  $name = $p['name'] ?: 'Chamber of Commerce';
  $short = $p['short_name'] ?: 'Chamber';
  $town = $p['town'] ?: 'Our town';
  $appId = uuid4();
  seed_insert('apps', [
    'id' => $appId, 'name' => $name, 'slug' => 'chamber', 'description' => $p['description'] ?? null,
    'theme_color' => '#B8956B', 'background_color' => '#1A1A1A', 'status' => 'active',
  ]);
  seed_insert('app_settings', [
    'app_name' => $name, 'short_name' => $short, 'description' => $p['description'] ?? null,
    'base_portal_url' => $p['portal_url'] ?? null, 'icon_url' => $p['icon_url'] ?? null, 'logo_url' => $p['icon_url'] ?? null,
    'primary_color' => '#B8956B', 'theme_color' => '#B8956B', 'secondary_color' => '#8B7355', 'theme_mode' => 'dark',
    'legacy_app_id' => $appId, 'subdomain' => parse_url(site_url(), PHP_URL_HOST),
  ]);
  $pos = 0;
  foreach ([
    ['business-directory', 'Directory', 'Building2'], ['events-calendar', 'Events', 'Calendar'],
    ['ai-concierge', 'Concierge', 'MessageCircle'], ['member-portal', 'Member', 'Users'], ['weather', 'Weather', 'Cloud'],
  ] as [$type, $label, $icon]) {
    seed_insert('app_features', ['app_id' => $appId, 'feature_type' => $type, 'name' => $label, 'icon' => $icon, 'position' => $pos++, 'is_enabled' => true, 'settings' => new stdClass()]);
  }

  $sec = fn(string $type, int $pos, array $settings, ?string $t = null, ?string $tes = null) =>
    seed_insert('home_sections', ['type' => $type, 'position' => $pos, 'title' => $t, 'title_es' => $tes, 'settings' => $settings ?: new stdClass()]);
  $sec('hero', 1, ['show_weather' => true]);
  $sec('ask_mule', 2, [
    'placeholder' => 'Ask us anything…', 'placeholder_es' => 'Pregúntenos lo que sea…',
    'chips' => [
      ['text' => 'Where can I eat?', 'text_es' => '¿Dónde puedo comer?'],
      ['text' => "What's on this week?", 'text_es' => '¿Qué hay esta semana?'],
      ['text' => "Who's hiring?", 'text_es' => '¿Quién está contratando?'],
    ],
  ]);
  $tiles = $sec('tiles', 3, ['columns' => 2], 'Quick picks', 'Accesos rápidos');
  $icons = $sec('icons', 4, ['columns' => 3]);
  $sec('alerts', 5, []);
  $sec('latest', 6, [
    'count' => 3, 'empty_title' => 'All quiet for now.', 'empty_title_es' => 'Todo tranquilo por aquí.',
    'empty_text' => 'News and events from the Chamber will show up here.', 'empty_text_es' => 'Aquí aparecerán las noticias y eventos de la Cámara.',
  ], 'Latest from the Chamber', 'Lo último de la Cámara');
  $sec('footer', 7, ['text' => $town, 'text_es' => $town]);

  $item = function (string $section, int $pos, array $v) {
    seed_insert('home_section_items', $v + ['section_id' => $section, 'position' => $pos, 'open_mode' => 'auto']);
  };
  $item($tiles, 1, ['label' => 'Events', 'label_es' => 'Eventos', 'hint' => "What's on in town", 'hint_es' => 'Qué hay en el pueblo', 'icon' => 'calendar', 'color' => '#B4532A', 'link_type' => 'tab', 'link_value' => 'events']);
  $item($tiles, 2, ['label' => 'Directory', 'label_es' => 'Directorio', 'hint' => 'Find a local business', 'hint_es' => 'Encuentre un negocio local', 'icon' => 'building-2', 'color' => '#2C6E73', 'link_type' => 'tab', 'link_value' => 'directory']);
  $item($tiles, 3, ['label' => 'Deals', 'label_es' => 'Ofertas', 'hint' => 'Member specials', 'hint_es' => 'Especiales para miembros', 'icon' => 'tag', 'color' => '#9A6A17', 'link_type' => 'portal', 'link_value' => '/sales']);
  $item($tiles, 4, ['label' => 'Jobs', 'label_es' => 'Empleos', 'hint' => 'Now hiring nearby', 'hint_es' => 'Se contrata cerca', 'icon' => 'briefcase', 'color' => '#557236', 'link_type' => 'portal', 'link_value' => '/jobs']);
  $n = 1;
  foreach ([
    ['News', 'Noticias', 'newspaper', '#4A7397', '/news', 'auto'], ['Visit', 'Visítenos', 'map-pin', '#8F7AA8', '/visit', 'auto'],
    ['Newsletter', 'Boletín', 'mail', '#D3A55B', '/newsletter', 'auto'], ['Join', 'Únase', 'user-plus', '#2E9A64', '/join', 'auto'],
    ['Contact', 'Contacto', 'phone', '#8FA79A', '/contact', 'auto'], ['Member Portal', 'Portal de miembros', 'users', '#6E7FA8', '/member-portal', 'browser'],
  ] as [$l, $les, $ic, $col, $val, $mode]) {
    $item($icons, $n++, ['label' => $l, 'label_es' => $les, 'icon' => $ic, 'color' => $col, 'link_type' => 'portal', 'link_value' => $val, 'open_mode' => $mode]);
  }
}

// =================== Import from the old Supabase app ===================

const IMPORT_TABLES = [
  'app_settings', 'apps', 'app_features', 'feature_links', 'feature_rss_feeds', 'feature_custom_pages',
  'home_sections', 'home_section_items', 'home_banner_slides', 'home_gallery_photos',
];

function supabase_fetch(string $url, string $key, string $table, ?string $token): array {
  $rows = [];
  $select = '*';
  if ($table === 'home_banner_slides' && !$token) {
    // Visitors may not read the counters, so ask only for the public columns.
    $select = 'id,section_id,position,is_visible,image_url,image_url_es,alt_text,alt_text_es,link_type,link_value,open_mode,start_at,end_at';
  }
  for ($offset = 0; $offset < 20000; $offset += 1000) {
    [$status, $text] = http_request('GET', rtrim($url, '/') . "/rest/v1/$table?select=$select&offset=$offset&limit=1000", [
      "apikey: $key", 'Authorization: Bearer ' . ($token ?: $key), 'Accept: application/json',
    ], null, 30, 30000000);
    if ($status === 404) return [];
    if ($status < 200 || $status >= 300) throw new RuntimeException("$table: HTTP $status " . substr($text, 0, 200));
    $page = json_decode($text, true);
    if (!is_array($page)) throw new RuntimeException("$table: bad response");
    $rows = array_merge($rows, $page);
    if (count($page) < 1000) break;
  }
  return $rows;
}

/** Signs in to the old app as an admin so hidden Home items and banner counts can be copied too. */
function supabase_login(string $url, string $key, string $email, string $password): string {
  [$status, $text] = http_request('POST', rtrim($url, '/') . '/auth/v1/token?grant_type=password', [
    "apikey: $key", 'Content-Type: application/json',
  ], json_encode(['email' => $email, 'password' => $password]), 20);
  $j = json_decode($text, true);
  if ($status !== 200 || empty($j['access_token'])) throw new RuntimeException('Could not sign in to the old app with that email and password.');
  return (string) $j['access_token'];
}

/**
 * Copies the old app's content (settings, tabs, Home screen, banners, gallery) and its uploaded
 * images into this site. Replaces what is here now. Without the old admin sign-in only visible
 * items can be read, so anything hidden in the old editor is skipped.
 */
function import_from_supabase(string $url, string $key, ?string $email = null, ?string $password = null): array {
  $url = rtrim($url, '/');
  $token = ($email && $password) ? supabase_login($url, $key, $email, $password) : null;
  $data = [];
  foreach (IMPORT_TABLES as $t) $data[$t] = supabase_fetch($url, $key, $t, $token);
  if (!$data['app_settings']) throw new RuntimeException('No app settings found in the old app. Check the address and key.');

  $oldBase = $url . '/storage/v1/object/public/';
  $newBase = site_url() . '/storage/v1/object/public/';
  $copied = 0;
  $failed = [];
  // Copy every uploaded image the content points to.
  $blob = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  preg_match_all('#' . preg_quote($oldBase, '#') . '([A-Za-z0-9_\-]+)/([^"\s?\#\\\\]+)#', $blob, $m, PREG_SET_ORDER);
  $seen = [];
  foreach ($m as [$full, $bucket, $path]) {
    if (isset($seen[$full])) continue;
    $seen[$full] = true;
    $rel = rawurldecode($path);
    if (str_contains($rel, '..')) continue;
    $target = UPLOAD_DIR . '/' . $bucket . '/' . $rel;
    if (is_file($target)) { $copied++; continue; }
    try {
      [$st, $bytes] = http_request('GET', $full, [], null, 30, 15000000);
      if ($st !== 200) throw new RuntimeException("HTTP $st");
      if (!is_dir(dirname($target))) mkdir(dirname($target), 0755, true);
      file_put_contents($target, $bytes);
      $copied++;
    } catch (Throwable $e) {
      $failed[] = $rel;
    }
  }

  $pdo = db();
  $pdo->beginTransaction();
  try {
    foreach (array_merge(IMPORT_TABLES, ['home_image_cleanup']) as $t) $pdo->exec("DELETE FROM `$t`");
    $counts = [];
    foreach (IMPORT_TABLES as $t) {
      $counts[$t] = 0;
      foreach ($data[$t] as $row) {
        $clean = [];
        foreach ($row as $c => $v) {
          if (!isset(SCHEMA[$t][$c])) continue;
          if (is_string($v)) $v = str_replace($oldBase, $newBase, $v);
          elseif (is_array($v)) $v = json_decode(str_replace(str_replace('/', '\\/', $oldBase), str_replace('/', '\\/', $newBase), str_replace($oldBase, $newBase, json_encode($v, JSON_UNESCAPED_UNICODE))), true);
          if (in_array($c, ['updated_by', 'user_id', 'assigned_by'], true)) $v = null;
          $clean[$c] = $v;
        }
        if ($t === 'home_sections' && isset($clean['settings']) && $clean['settings'] === []) $clean['settings'] = new stdClass();
        if ($t === 'app_features' && isset($clean['settings']) && $clean['settings'] === []) $clean['settings'] = new stdClass();
        seed_insert($t, $clean);
        $counts[$t]++;
      }
    }
    // The public app needs an "apps" record linked from app_settings.legacy_app_id.
    $settings = $pdo->query('SELECT id, legacy_app_id, app_name, description FROM app_settings LIMIT 1')->fetch();
    $appIds = $pdo->query('SELECT id FROM apps')->fetchAll(PDO::FETCH_COLUMN);
    $legacy = $settings['legacy_app_id'] ?? null;
    if (!$legacy || !in_array($legacy, $appIds, true)) {
      $featureApp = $pdo->query('SELECT app_id FROM app_features LIMIT 1')->fetchColumn();
      $legacy = $appIds[0] ?? ($featureApp ?: uuid4());
      if (!in_array($legacy, $appIds, true)) {
        seed_insert('apps', ['id' => $legacy, 'name' => $settings['app_name'], 'slug' => 'chamber', 'description' => $settings['description'], 'status' => 'active']);
      }
      $pdo->prepare('UPDATE app_settings SET legacy_app_id = ?')->execute([$legacy]);
    }
    $pdo->prepare('UPDATE app_features SET app_id = ?')->execute([$legacy]);

    // This site's own address replaces the old one.
    $host = parse_url(site_url(), PHP_URL_HOST);
    $pdo->prepare('UPDATE app_settings SET custom_domain = ?, subdomain = ?')->execute([$host, $host]);
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }

  // App icons in several sizes, hosted here instead of on the old platform.
  $icon = db()->query('SELECT COALESCE(icon_url, logo_url) FROM app_settings LIMIT 1')->fetchColumn();
  $iconErr = $icon ? make_brand_icons((string) $icon) : 'No icon set';

  return ['signed_in' => (bool) $token, 'counts' => $counts, 'images_copied' => $copied, 'images_failed' => $failed, 'icon' => $iconErr ?: 'App icons created'];
}
