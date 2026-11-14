<?php
/**
 * Setup page.
 *  - First visit: connect the MySQL database, enter the chamber details and Gravitec keys,
 *    create the owner login, then start fresh or copy the content from the old app.
 *  - After setup: owners sign in here to change server settings (Gravitec keys, email sender,
 *    dashboard API key), re-run the import, or apply database updates after a new release.
 * Secrets typed here are saved only in data/config.php on this server.
 */

declare(strict_types=1);
require_once __DIR__ . '/server/lib/bootstrap.php';
require_once __DIR__ . '/server/lib/auth.php';
require_once __DIR__ . '/server/lib/rest.php';
require_once __DIR__ . '/server/lib/setup.php';

header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
start_session();
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));

$h = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
$presets = [];
foreach (glob(__DIR__ . '/server/presets/*.json') as $f) {
  $presets[basename($f, '.json')] = json_decode((string) file_get_contents($f), true);
}
$presetKey = $_GET['preset'] ?? $_POST['preset'] ?? (isset($presets['muleshoe']) ? 'muleshoe' : 'blank');
$preset = $presets[$presetKey] ?? ($presets['blank'] ?? []);
$errors = [];
$notes = [];
$done = null;

function write_config(array $cfg): void {
  if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0750, true);
  $php = "<?php\n// Chamber app server settings. Written by install.php. Keep this file private.\nreturn " . var_export($cfg, true) . ";\n";
  $tmp = CONFIG_FILE . '.tmp';
  if (file_put_contents($tmp, $php) === false) throw new RuntimeException('Could not write data/config.php. Check that the data folder is writable.');
  @chmod($tmp, 0640);
  rename($tmp, CONFIG_FILE);
  if (function_exists('opcache_invalidate')) @opcache_invalidate(CONFIG_FILE, true);
  config_reload();
}

function check_csrf(): void {
  if (!hash_equals($_SESSION['csrf'] ?? '', (string) ($_POST['csrf'] ?? ''))) throw new RuntimeException('This form expired. Reload the page and try again.');
}

function preset_icon_source(array $preset): ?string {
  $u = (string) ($preset['icon_url'] ?? '');
  if (str_starts_with($u, 'preset:')) {
    $f = __DIR__ . '/server/presets/' . basename(substr($u, 7));
    return is_file($f) ? $f : null;
  }
  return $u ?: null;
}

$installed = is_installed();

// ======================= FIRST-TIME SETUP =======================
if (!$installed && $_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    check_csrf();
    $p = fn($k, $d = '') => trim((string) ($_POST[$k] ?? $d));
    $dbHost = $p('db_host', 'localhost');
    if (!in_array(strtolower($dbHost), ['localhost', '127.0.0.1', '::1'], true) && !preg_match('/^(mysql|localhost)/i', $dbHost)) {
      throw new RuntimeException('For safety the database must be on this server (host "localhost").');
    }
    $email = strtolower($p('admin_email'));
    $pw = (string) ($_POST['admin_password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Enter a valid admin email.');
    if (strlen($pw) < 10) throw new RuntimeException('Choose an admin password of at least 10 characters.');
    if ($p('name') === '') throw new RuntimeException('Enter the chamber name.');

    $cfg = [
      'db' => ['host' => $dbHost, 'port' => (int) $p('db_port', '3306'), 'name' => $p('db_name'), 'user' => $p('db_user'), 'pass' => (string) ($_POST['db_pass'] ?? '')],
      'site_url' => rtrim($p('site_url') ?: site_url(), '/'),
      'timezone' => $p('timezone', 'America/Chicago'),
      'mail_from' => $p('mail_from'),
      'weather' => ['lat' => (float) $p('weather_lat'), 'lon' => (float) $p('weather_lon'), 'location' => $p('weather_location')],
      'gravitec' => ['app_key' => $p('gravitec_app_key'), 'app_secret' => (string) ($_POST['gravitec_app_secret'] ?? '')],
      'api_key' => bin2hex(random_bytes(24)),
      'team_invites' => 'email',
      'branding' => [],
      'installed_at' => gmdate('c'),
    ];
    // Test the database before saving anything.
    $dsn = "mysql:host={$cfg['db']['host']};port={$cfg['db']['port']};dbname={$cfg['db']['name']};charset=utf8mb4";
    try {
      $pdo = new PDO($dsn, $cfg['db']['user'], $cfg['db']['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    } catch (PDOException $e) {
      throw new RuntimeException('Could not connect to the database: ' . $e->getMessage());
    }
    $existing = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'profiles'")->fetchColumn();
    if ($existing) {
      $owners = (int) $pdo->query("SELECT COUNT(*) FROM profiles WHERE role = 'owner'")->fetchColumn();
      if ($owners > 0) throw new RuntimeException('This database already has an owner. Use a new, empty database, or restore data/config.php.');
    }

    write_config($cfg);
    $log = migrate(db());

    $mode = $p('content', 'fresh');
    if ($mode === 'import') {
      $res = import_from_supabase($p('import_url'), $p('import_key'), $p('import_email') ?: null, (string) ($_POST['import_password'] ?? '') ?: null);
      $notes[] = 'Copied from the old app: ' . implode(', ', array_map(fn($k, $v) => "$v $k", array_keys($res['counts']), $res['counts'])) . '.';
      $notes[] = "Images copied: {$res['images_copied']}" . ($res['images_failed'] ? ' (could not copy: ' . implode(', ', array_slice($res['images_failed'], 0, 5)) . ')' : '') . '.';
      if (!$res['signed_in']) $notes[] = 'Signed in to the old app: no, so hidden Home items and banner counts were not copied.';
      if ($res['icon'] !== 'App icons created' && ($src = preset_icon_source($preset))) {
        $err = make_brand_icons($src);
        $notes[] = $err ? "App icons: $err" : 'App icons created from the preset logo.';
      } else {
        $notes[] = $res['icon'] . '.';
      }
    } else {
      seed_fresh([
        'name' => $p('name'), 'short_name' => $p('short_name'), 'description' => $p('description'),
        'town' => $p('town'), 'portal_url' => $p('portal_url'), 'icon_url' => null,
      ]);
      if ($src = preset_icon_source($preset)) {
        $err = make_brand_icons($src);
        if (!$err) db()->exec("UPDATE app_settings SET icon_url = '/uploads/branding/icon-512.png', logo_url = '/uploads/branding/icon-512.png'");
      }
    }
    // Keep a copy of the assistant avatar on this server (the old one lives on another platform).
    if (!empty($preset['assistant_image_url'])) {
      try {
        [$st, $img] = http_request('GET', (string) $preset['assistant_image_url'], ['User-Agent: ChamberApp/1.0'], null, 20, 5000000);
        if ($st === 200 && @imagecreatefromstring($img)) {
          if (!is_dir(UPLOAD_DIR . '/branding')) mkdir(UPLOAD_DIR . '/branding', 0755, true);
          file_put_contents(UPLOAD_DIR . '/branding/assistant.png', $img);
        } else {
          $notes[] = 'Could not copy the assistant picture; the app will keep using the old address.';
        }
      } catch (Throwable $e) {
        $notes[] = 'Could not copy the assistant picture; the app will keep using the old address.';
      }
    }
    // Name/description typed on this page win over imported ones.
    $set = ['app_name = ?', 'short_name = ?'];
    $args = [$p('name'), $p('short_name') ?: $p('name')];
    if ($p('description') !== '') { $set[] = 'description = ?'; $args[] = $p('description'); }
    if ($p('portal_url') !== '') { $set[] = 'base_portal_url = ?'; $args[] = $p('portal_url'); }
    db()->prepare('UPDATE app_settings SET ' . implode(', ', $set))->execute($args);

    $uid = create_user($email, $pw, 'owner', $p('admin_name') ?: null);
    sign_in_session($uid);
    $done = ['log' => $log];
    $installed = true;
  } catch (Throwable $e) {
    if (is_file(CONFIG_FILE) && empty($done)) @unlink(CONFIG_FILE);
    $errors[] = $e->getMessage();
  }
}

// ======================= SETTINGS (after setup) =======================
$owner = false;
if ($installed && !$done) {
  try {
    $owner = actor()['role'] === 'owner';
  } catch (Throwable $e) {
    $owner = false;
  }
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
      check_csrf();
      $act = $_POST['act'] ?? '';
      if ($act === 'login') {
        if (too_many_attempts()) throw new RuntimeException('Too many attempts. Wait 15 minutes.');
        $u = find_user_by_email((string) ($_POST['email'] ?? ''));
        if (!$u || !$u['password_hash'] || !password_verify((string) ($_POST['password'] ?? ''), $u['password_hash'])) {
          record_attempt((string) ($_POST['email'] ?? ''));
          throw new RuntimeException('Wrong email or password.');
        }
        sign_in_session($u['id']);
        header('Location: /install.php');
        exit;
      }
      if (!$owner) throw new RuntimeException('Only an owner can change server settings.');
      $cfg = config();
      if ($act === 'save') {
        $cfg['gravitec']['app_key'] = trim((string) $_POST['gravitec_app_key']);
        if (($_POST['gravitec_app_secret'] ?? '') !== '') $cfg['gravitec']['app_secret'] = (string) $_POST['gravitec_app_secret'];
        $cfg['mail_from'] = trim((string) $_POST['mail_from']);
        $cfg['site_url'] = rtrim(trim((string) $_POST['site_url']), '/');
        $cfg['timezone'] = trim((string) $_POST['timezone']);
        $cfg['weather'] = ['lat' => (float) $_POST['weather_lat'], 'lon' => (float) $_POST['weather_lon'], 'location' => trim((string) $_POST['weather_location'])];
        $cfg['team_invites'] = ($_POST['team_invites'] ?? 'email') === 'link' ? 'link' : 'email';
        write_config($cfg);
        @unlink(DATA_DIR . '/cache/' . sha1('weather') . '.json');
        $notes[] = 'Settings saved.';
      } elseif ($act === 'new_api_key') {
        $cfg['api_key'] = bin2hex(random_bytes(24));
        write_config($cfg);
        $notes[] = 'A new dashboard API key was made. The old one no longer works.';
      } elseif ($act === 'migrate') {
        $log = migrate(db());
        $notes[] = $log ? 'Database updated: ' . implode('; ', $log) : 'Database is already up to date.';
      } elseif ($act === 'icons') {
        $src = trim((string) ($_POST['icon_source'] ?? ''));
        if ($src === '') $src = (string) db()->query('SELECT COALESCE(icon_url, logo_url) FROM app_settings LIMIT 1')->fetchColumn();
        if ($src && str_starts_with($src, '/')) $src = APP_ROOT . parse_url($src, PHP_URL_PATH);
        $err = $src ? make_brand_icons($src) : 'No icon set in Settings.';
        $notes[] = $err ?: 'App icons rebuilt. Reinstall the app on a phone to see a new icon.';
      } elseif ($act === 'import') {
        if (($_POST['confirm'] ?? '') !== 'REPLACE') throw new RuntimeException('Type REPLACE to confirm the import.');
        $res = import_from_supabase(trim((string) $_POST['import_url']), trim((string) $_POST['import_key']), trim((string) ($_POST['import_email'] ?? '')) ?: null, (string) ($_POST['import_password'] ?? '') ?: null);
        $notes[] = 'Imported: ' . implode(', ', array_map(fn($k, $v) => "$v $k", array_keys($res['counts']), $res['counts'])) . ". Images: {$res['images_copied']}." . ($res['signed_in'] ? '' : ' (Not signed in, so hidden items were skipped.)');
      } elseif ($act === 'logout') {
        $_SESSION = [];
        session_destroy();
        header('Location: /install.php');
        exit;
      }
      $owner = true;
    } catch (Throwable $e) {
      $errors[] = $e->getMessage();
    }
  }
}

$cfg = config();
$val = fn(string $key, $fallback = '') => $_POST[$key] ?? $fallback;
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>App setup</title>
<style>
  :root { --bg:#F5EEE2; --card:#fff; --text:#2B2118; --muted:#6B5B4B; --accent:#B8956B; --accent-d:#8B7355; --line:#E5D9C6; --err:#B3261E; --ok:#2E7D32; }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.5 Inter, system-ui, -apple-system, Segoe UI, sans-serif; background:var(--bg); color:var(--text); }
  main { max-width:760px; margin:0 auto; padding:32px 16px 64px; }
  h1 { font-size:28px; margin:0 0 4px; } h2 { font-size:19px; margin:0 0 4px; }
  p.lead { color:var(--muted); margin:0 0 24px; }
  section { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:20px; margin:0 0 16px; }
  section > p { color:var(--muted); margin:0 0 14px; font-size:14px; }
  label { display:block; font-weight:600; font-size:14px; margin:12px 0 4px; }
  .hint { font-weight:400; color:var(--muted); font-size:13px; }
  input, select, textarea { width:100%; padding:10px 12px; font:inherit; border:1px solid var(--line); border-radius:10px; background:#FFFDF9; color:var(--text); }
  input:focus, select:focus { outline:2px solid var(--accent); outline-offset:1px; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:12px; } .row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  @media (max-width:560px) { .row, .row3 { grid-template-columns:1fr; } }
  button { background:var(--accent-d); color:#fff; border:0; border-radius:10px; padding:12px 18px; font:inherit; font-weight:600; cursor:pointer; }
  button.secondary { background:#fff; color:var(--text); border:1px solid var(--line); }
  .radio { display:flex; gap:10px; align-items:flex-start; padding:12px; border:1px solid var(--line); border-radius:10px; margin:8px 0; font-weight:400; }
  .radio input { width:auto; margin-top:4px; }
  .msg { padding:12px 14px; border-radius:10px; margin:0 0 16px; }
  .msg.err { background:#FDECEA; color:var(--err); } .msg.ok { background:#EAF4EA; color:var(--ok); }
  code, .key { font-family: ui-monospace, Menlo, monospace; font-size:13px; background:#F5EEE2; padding:2px 6px; border-radius:6px; word-break:break-all; }
  details summary { cursor:pointer; font-weight:600; }
  .actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; }
</style>
</head>
<body><main>
<?php foreach ($errors as $e): ?><div class="msg err"><?= $h($e) ?></div><?php endforeach; ?>
<?php foreach ($notes as $n): ?><div class="msg ok"><?= $h($n) ?></div><?php endforeach; ?>

<?php if ($done): ?>
  <h1>Setup complete</h1>
  <p class="lead">The app is live and you are signed in as the owner.</p>
  <section>
    <h2>Next steps</h2>
    <p>1. Open the <a href="/admin">admin</a> to check the Home screen, banners and settings.<br>
    2. Open <a href="/">the app</a> on your phone and allow notifications, then send yourself a test from Admin → Notify.<br>
    3. Come back to <a href="/install.php">this page</a> any time to change the Gravitec keys or email sender.</p>
  </section>
<?php elseif (!$installed): ?>
  <h1>Set up the chamber app</h1>
  <p class="lead">This runs once. Everything you type here is saved only on this server.</p>
  <form method="post" autocomplete="off">
    <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>">
    <input type="hidden" name="preset" value="<?= $h($presetKey) ?>">
    <section>
      <h2>Start from</h2>
      <p>Fills in the chamber details below. You can change any of them.</p>
      <select onchange="location.search='?preset='+this.value">
        <?php foreach ($presets as $k => $pr): ?><option value="<?= $h($k) ?>" <?= $k === $presetKey ? 'selected' : '' ?>><?= $h($pr['label'] ?? $k) ?></option><?php endforeach; ?>
      </select>
    </section>
    <section>
      <h2>1. Database</h2>
      <p>From Hostinger: Websites → Dashboard → Databases → MySQL Databases. Create one, then copy its details here.</p>
      <div class="row">
        <div><label>Database name</label><input name="db_name" required value="<?= $h($val('db_name')) ?>" placeholder="u123456789_chamber"></div>
        <div><label>Database user</label><input name="db_user" required value="<?= $h($val('db_user')) ?>" placeholder="u123456789_chamber"></div>
      </div>
      <div class="row">
        <div><label>Database password</label><input type="password" name="db_pass" required></div>
        <div><label>Host <span class="hint">(leave as localhost)</span></label><input name="db_host" value="<?= $h($val('db_host', 'localhost')) ?>"></div>
      </div>
    </section>
    <section>
      <h2>2. Chamber</h2>
      <label>Chamber name</label><input name="name" required value="<?= $h($val('name', $preset['name'] ?? '')) ?>">
      <div class="row">
        <div><label>Short name <span class="hint">(under the phone icon)</span></label><input name="short_name" value="<?= $h($val('short_name', $preset['short_name'] ?? '')) ?>"></div>
        <div><label>App address</label><input name="site_url" value="<?= $h($val('site_url', $preset['site_url'] ?? '') ?: site_url()) ?>"></div>
      </div>
      <label>Description</label><input name="description" value="<?= $h($val('description', $preset['description'] ?? '')) ?>">
      <div class="row">
        <div><label>Chamber website</label><input name="portal_url" value="<?= $h($val('portal_url', $preset['portal_url'] ?? '')) ?>"></div>
        <div><label>Footer line</label><input name="town" value="<?= $h($val('town', $preset['town'] ?? '')) ?>"></div>
      </div>
      <div class="row">
        <div><label>Time zone</label><input name="timezone" value="<?= $h($val('timezone', $preset['timezone'] ?? 'America/Chicago')) ?>"></div>
        <div><label>Email "from" address <span class="hint">(for invites and resets)</span></label><input name="mail_from" value="<?= $h($val('mail_from', $preset['mail_from'] ?? '')) ?>"></div>
      </div>
      <div class="row3">
        <div><label>Weather latitude</label><input name="weather_lat" value="<?= $h($val('weather_lat', $preset['weather']['lat'] ?? '')) ?>"></div>
        <div><label>Weather longitude</label><input name="weather_lon" value="<?= $h($val('weather_lon', $preset['weather']['lon'] ?? '')) ?>"></div>
        <div><label>Weather place name</label><input name="weather_location" value="<?= $h($val('weather_location', $preset['weather']['location'] ?? '')) ?>"></div>
      </div>
    </section>
    <section>
      <h2>3. Push notifications (Gravitec)</h2>
      <p>From gravitec.net → your site → Settings → REST API. You can also add these later on this page.</p>
      <div class="row">
        <div><label>App Key</label><input name="gravitec_app_key" value="<?= $h($val('gravitec_app_key')) ?>"></div>
        <div><label>App Secret</label><input type="password" name="gravitec_app_secret"></div>
      </div>
    </section>
    <section>
      <h2>4. Owner login</h2>
      <div class="row">
        <div><label>Your name</label><input name="admin_name" value="<?= $h($val('admin_name')) ?>"></div>
        <div><label>Admin email</label><input type="email" name="admin_email" required value="<?= $h($val('admin_email')) ?>"></div>
      </div>
      <label>Admin password <span class="hint">(10+ characters)</span></label><input type="password" name="admin_password" required minlength="10">
    </section>
    <section>
      <h2>5. Content</h2>
      <?php $imp = $preset['import'] ?? []; $hasImport = !empty($imp['supabase_url']); ?>
      <label class="radio"><input type="radio" name="content" value="import" <?= $hasImport ? 'checked' : '' ?>> <span><b>Copy everything from the old app</b><br><span class="hint">Home screen, buttons, banners, gallery, tabs, colors and images.</span></span></label>
      <label class="radio"><input type="radio" name="content" value="fresh" <?= $hasImport ? '' : 'checked' ?>> <span><b>Start with a fresh starter Home screen</b><br><span class="hint">For a new chamber. Edit everything later in the admin.</span></span></label>
      <details <?= $hasImport ? 'open' : '' ?>><summary>Old app details</summary>
        <label>Old app database address</label><input name="import_url" value="<?= $h($val('import_url', $imp['supabase_url'] ?? '')) ?>">
        <label>Old app public key</label><input name="import_key" value="<?= $h($val('import_key', $imp['supabase_anon_key'] ?? '')) ?>">
        <p class="hint" style="margin-top:10px">Optional: your old admin login, so hidden items and banner counts are copied too.</p>
        <div class="row">
          <div><label>Old admin email</label><input name="import_email" value="<?= $h($val('import_email')) ?>"></div>
          <div><label>Old admin password</label><input type="password" name="import_password"></div>
        </div>
      </details>
    </section>
    <div class="actions"><button type="submit">Set up the app</button></div>
  </form>

<?php elseif (!$owner): ?>
  <h1>Server settings</h1>
  <p class="lead">This app is already set up. Owners can sign in to change server settings.</p>
  <form method="post"><section>
    <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="act" value="login">
    <label>Email</label><input type="email" name="email" required>
    <label>Password</label><input type="password" name="password" required>
    <div class="actions"><button>Sign in</button> <a href="/admin" style="align-self:center">Go to the admin</a></div>
  </section></form>

<?php else: ?>
  <h1>Server settings</h1>
  <p class="lead">Private settings for <?= $h(app_name()) ?>. Names, colors and Home content are edited in the <a href="/admin">admin</a>.</p>
  <form method="post"><section>
    <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="act" value="save">
    <h2>Push notifications (Gravitec)</h2>
    <div class="row">
      <div><label>App Key</label><input name="gravitec_app_key" value="<?= $h($cfg['gravitec']['app_key'] ?? '') ?>"></div>
      <div><label>App Secret <span class="hint"><?= !empty($cfg['gravitec']['app_secret']) ? '(saved; leave blank to keep)' : '(not set)' ?></span></label><input type="password" name="gravitec_app_secret"></div>
    </div>
    <h2 style="margin-top:20px">General</h2>
    <div class="row">
      <div><label>App address</label><input name="site_url" value="<?= $h($cfg['site_url'] ?? '') ?>"></div>
      <div><label>Email "from" address</label><input name="mail_from" value="<?= $h($cfg['mail_from'] ?? '') ?>"></div>
    </div>
    <div class="row">
      <div><label>Time zone</label><input name="timezone" value="<?= $h($cfg['timezone'] ?? 'America/Chicago') ?>"></div>
      <div><label>Team invites</label><select name="team_invites">
        <option value="email" <?= ($cfg['team_invites'] ?? 'email') === 'email' ? 'selected' : '' ?>>Send by email</option>
        <option value="link" <?= ($cfg['team_invites'] ?? '') === 'link' ? 'selected' : '' ?>>Show a link to copy</option></select></div>
    </div>
    <div class="row3">
      <div><label>Weather latitude</label><input name="weather_lat" value="<?= $h($cfg['weather']['lat'] ?? '') ?>"></div>
      <div><label>Weather longitude</label><input name="weather_lon" value="<?= $h($cfg['weather']['lon'] ?? '') ?>"></div>
      <div><label>Weather place name</label><input name="weather_location" value="<?= $h($cfg['weather']['location'] ?? '') ?>"></div>
    </div>
    <div class="actions"><button>Save settings</button></div>
  </section></form>

  <section>
    <h2>Dashboard API key</h2>
    <p>A central dashboard can manage this app by sending this key in an <code>X-Api-Key</code> header. Treat it like a password.</p>
    <details><summary>Show key</summary>
      <p style="display:flex;gap:8px;align-items:center"><input id="api-key" class="key" readonly value="<?= $h($cfg['api_key'] ?? '') ?>" onfocus="this.select()" style="flex:1;min-width:0">
      <button type="button" class="secondary" onclick="var k=document.getElementById('api-key');k.select();(navigator.clipboard?navigator.clipboard.writeText(k.value):Promise.reject()).then(function(){},function(){document.execCommand('copy')});this.textContent='Copied';">Copy</button></p>
    </details>
    <form method="post" class="actions"><input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="act" value="new_api_key"><button class="secondary">Make a new key</button></form>
  </section>

  <section>
    <h2>Maintenance</h2>
    <p>After deploying a new version, apply database updates. Rebuild icons after changing the app icon in Settings.</p>
    <div class="actions">
      <form method="post"><input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="act" value="migrate"><button class="secondary">Apply database updates</button></form>
      <form method="post"><input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="act" value="icons"><button class="secondary">Rebuild app icons</button></form>
    </div>
  </section>

  <section>
    <h2>Copy content from the old app again</h2>
    <p>Replaces the Home screen, banners, gallery, tabs and settings here with the old app's. Team logins and notifications are kept.</p>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="act" value="import">
      <?php $imp = $presets['muleshoe']['import'] ?? []; ?>
      <label>Old app database address</label><input name="import_url" value="<?= $h($imp['supabase_url'] ?? '') ?>">
      <label>Old app public key</label><input name="import_key" value="<?= $h($imp['supabase_anon_key'] ?? '') ?>">
      <div class="row">
        <div><label>Old admin email <span class="hint">(optional)</span></label><input name="import_email"></div>
        <div><label>Old admin password</label><input type="password" name="import_password"></div>
      </div>
      <label>Type REPLACE to confirm</label><input name="confirm" autocomplete="off">
      <div class="actions"><button class="secondary">Copy from the old app</button></div>
    </form>
  </section>
  <form method="post"><input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="act" value="logout"><button class="secondary">Sign out</button></form>
<?php endif; ?>
</main></body></html>
