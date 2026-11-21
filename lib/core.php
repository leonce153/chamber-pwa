<?php
/**
 * Chamber master dashboard: config, database, sessions, security helpers and page layout.
 * Secrets (each app's API key, deploy hook, the GitHub token) are encrypted in the database
 * with the key in data/config.php, which never leaves the server.
 */

declare(strict_types=1);

define('DASH_ROOT', dirname(__DIR__));
define('DASH_CONFIG', DASH_ROOT . '/data/config.php');
define('DASH_VERSION', '1.3.0');

date_default_timezone_set('UTC');

function cfg(?string $key = null, $default = null) {
  static $cfg = null;
  if ($cfg === null) {
    $cfg = is_file(DASH_CONFIG) ? (require DASH_CONFIG) : [];
    if (!is_array($cfg)) $cfg = [];
  }
  if ($key === null) return $cfg;
  $cur = $cfg;
  foreach (explode('.', $key) as $p) {
    if (!is_array($cur) || !array_key_exists($p, $cur)) return $default;
    $cur = $cur[$p];
  }
  return $cur;
}

function write_config(array $cfg): void {
  if (!is_dir(DASH_ROOT . '/data')) mkdir(DASH_ROOT . '/data', 0750, true);
  $php = "<?php\n// Written by setup. Keep private.\nreturn " . var_export($cfg, true) . ";\n";
  if (file_put_contents(DASH_CONFIG, $php, LOCK_EX) === false) throw new RuntimeException('Could not write data/config.php');
  @chmod(DASH_CONFIG, 0640);
  if (function_exists('opcache_invalidate')) @opcache_invalidate(DASH_CONFIG, true);
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $dsn = 'mysql:host=' . cfg('db.host', 'localhost') . ';port=' . (int) cfg('db.port', 3306) . ';dbname=' . cfg('db.name') . ';charset=utf8mb4';
  $pdo = new PDO($dsn, (string) cfg('db.user'), (string) cfg('db.pass'), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  $pdo->exec("SET time_zone = '+00:00'");
  return $pdo;
}

const DASH_TABLES = [
  'users' => "id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL, last_login_at DATETIME NULL",
  'apps' => "id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190) NOT NULL, url VARCHAR(255) NOT NULL, api_key TEXT NULL, branch VARCHAR(120) NOT NULL DEFAULT '', deploy_hook TEXT NULL, is_template TINYINT(1) NOT NULL DEFAULT 0, notes TEXT NULL, position INT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL",
  'activity' => "id INT AUTO_INCREMENT PRIMARY KEY, app_id INT NULL, who VARCHAR(190) NULL, action VARCHAR(80) NOT NULL, detail TEXT NULL, ok TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL, KEY app_id (app_id), KEY created_at (created_at)",
  'backups' => "id INT AUTO_INCREMENT PRIMARY KEY, app_id INT NOT NULL, grp VARCHAR(20) NOT NULL, label VARCHAR(255) NULL, rows_json LONGTEXT NOT NULL, created_at DATETIME NOT NULL, KEY app_id (app_id)",
  'settings' => "k VARCHAR(80) PRIMARY KEY, v TEXT NULL",
  'login_attempts' => "id INT AUTO_INCREMENT PRIMARY KEY, ip VARCHAR(64) NOT NULL, created_at DATETIME NOT NULL, KEY ip (ip)",
  // ---- HQ: chambers on the Base44 platform, CRM, docs ----
  'chambers' => "id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190) NOT NULL, town VARCHAR(120) NULL, state VARCHAR(40) NULL, status VARCHAR(20) NOT NULL DEFAULT 'onboarding', plan VARCHAR(30) NOT NULL DEFAULT 'founding', monthly_price DECIMAL(10,2) NULL, org_id INT NULL, sponsor_org_id INT NULL, member_count INT NULL, site_url VARCHAR(255) NULL, admin_url VARCHAR(255) NULL, base44_app_id VARCHAR(64) NULL, app_id INT NULL, connector_url VARCHAR(255) NULL, connector_key TEXT NULL, grace_ends DATE NULL, notes TEXT NULL, snapshot_json MEDIUMTEXT NULL, snapshot_at DATETIME NULL, snapshot_error VARCHAR(500) NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, KEY org_id (org_id), KEY app_id (app_id)",
  'orgs' => "id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190) NOT NULL, kind VARCHAR(20) NOT NULL DEFAULT 'prospect', town VARCHAR(120) NULL, state VARCHAR(40) NULL, website VARCHAR(255) NULL, member_count INT NULL, current_software VARCHAR(120) NULL, notes TEXT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, KEY name (name), KEY kind (kind)",
  'contacts' => "id INT AUTO_INCREMENT PRIMARY KEY, org_id INT NULL, name VARCHAR(190) NOT NULL, title VARCHAR(120) NULL, email VARCHAR(190) NULL, phone VARCHAR(60) NULL, do_not_email TINYINT(1) NOT NULL DEFAULT 0, notes TEXT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, KEY org_id (org_id), KEY email (email)",
  'deals' => "id INT AUTO_INCREMENT PRIMARY KEY, org_id INT NULL, contact_id INT NULL, pipeline VARCHAR(20) NOT NULL DEFAULT 'chamber', title VARCHAR(190) NOT NULL, stage VARCHAR(30) NOT NULL DEFAULT 'new', value_monthly DECIMAL(10,2) NULL, source VARCHAR(60) NULL, next_step VARCHAR(255) NULL, next_due DATE NULL, closed_at DATETIME NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, KEY org_id (org_id), KEY stage (pipeline, stage)",
  'activities' => "id INT AUTO_INCREMENT PRIMARY KEY, org_id INT NULL, contact_id INT NULL, deal_id INT NULL, chamber_id INT NULL, kind VARCHAR(20) NOT NULL DEFAULT 'note', body TEXT NOT NULL, who VARCHAR(190) NULL, created_at DATETIME NOT NULL, KEY org_id (org_id), KEY deal_id (deal_id), KEY chamber_id (chamber_id), KEY contact_id (contact_id)",
  'tasks' => "id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, due_date DATE NULL, done_at DATETIME NULL, org_id INT NULL, deal_id INT NULL, chamber_id INT NULL, contact_id INT NULL, created_at DATETIME NOT NULL, KEY open_due (done_at, due_date)",
  'docs' => "id INT AUTO_INCREMENT PRIMARY KEY, folder VARCHAR(80) NOT NULL DEFAULT 'General', title VARCHAR(190) NOT NULL, body MEDIUMTEXT NOT NULL, tags VARCHAR(255) NULL, last_checked DATE NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, KEY folder (folder), FULLTEXT KEY ft (title, body, tags)",
  'announcements' => "id INT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(190) NOT NULL, body MEDIUMTEXT NOT NULL, audience VARCHAR(40) NOT NULL, audience_label VARCHAR(255) NULL, recipients INT NOT NULL DEFAULT 0, sent INT NOT NULL DEFAULT 0, failed INT NOT NULL DEFAULT 0, who VARCHAR(190) NULL, sent_at DATETIME NOT NULL",
  'setup_checks' => "id INT AUTO_INCREMENT PRIMARY KEY, chamber_id INT NOT NULL, step VARCHAR(60) NOT NULL, state VARCHAR(10) NOT NULL DEFAULT 'done', done_at DATETIME NOT NULL, UNIQUE KEY chamber_step (chamber_id, step)",
  'ask_log' => "id INT AUTO_INCREMENT PRIMARY KEY, question TEXT NOT NULL, answer MEDIUMTEXT NULL, doc_ids VARCHAR(255) NULL, ok TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL",
];

/** Run migrate() once after each dashboard update, so new tables exist without a manual click. */
function ensure_schema(): void {
  if (setting('schema_version') === DASH_VERSION) return;
  migrate();
  set_setting('schema_version', DASH_VERSION);
}

function migrate(): array {
  $log = [];
  foreach (DASH_TABLES as $t => $def) {
    if (!db()->query('SHOW TABLES LIKE ' . db()->quote($t))->fetchColumn()) {
      db()->exec("CREATE TABLE `$t` ($def) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      $log[] = "Created $t";
    }
  }
  return $log;
}

function is_set_up(): bool {
  if (!cfg('db.name')) return false;
  try {
    return (bool) db()->query("SHOW TABLES LIKE 'users'")->fetchColumn() && (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;
  } catch (Throwable $e) {
    return false;
  }
}

function now(): string {
  return gmdate('Y-m-d H:i:s');
}

// ---------------- secrets ----------------

function seal(?string $plain): ?string {
  if ($plain === null || $plain === '') return null;
  $key = base64_decode((string) cfg('secret'));
  $iv = random_bytes(12);
  $tag = '';
  $ct = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
  if ($ct === false) throw new RuntimeException('Could not encrypt');
  return 'v2:' . base64_encode($iv . $tag . $ct);
}

function unseal(?string $sealed): ?string {
  if (!$sealed || !str_starts_with($sealed, 'v2:')) return null;
  $raw = base64_decode(substr($sealed, 3));
  $key = base64_decode((string) cfg('secret'));
  if (strlen($raw) < 29) return null;
  $out = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
  return $out === false ? null : $out;
}

function setting(string $k, ?string $default = null): ?string {
  $st = db()->prepare('SELECT v FROM settings WHERE k = ?');
  $st->execute([$k]);
  $v = $st->fetchColumn();
  return $v === false ? $default : $v;
}

function set_setting(string $k, ?string $v): void {
  db()->prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)')->execute([$k, $v]);
}

// ---------------- sessions & auth ----------------

function start_session(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  session_name('chamberdash');
  session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
  session_start();
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
  // Sign out after 12 hours without activity
  if (!empty($_SESSION['uid']) && ($_SESSION['seen'] ?? 0) < time() - 43200) {
    $_SESSION = ['csrf' => bin2hex(random_bytes(16))];
  }
  $_SESSION['seen'] = time();
}

function is_https(): bool {
  return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function client_ip(): string {
  return (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function current_user(): ?array {
  start_session();
  if (empty($_SESSION['uid'])) return null;
  static $u = null;
  if ($u === null) {
    $st = db()->prepare('SELECT id, email FROM users WHERE id = ?');
    $st->execute([$_SESSION['uid']]);
    $u = $st->fetch() ?: null;
  }
  return $u;
}

function require_login(): array {
  $u = current_user();
  if (!$u) {
    header('Location: index.php?p=login');
    exit;
  }
  return $u;
}

function csrf(): string {
  start_session();
  return $_SESSION['csrf'];
}

function csrf_field(): string {
  return '<input type="hidden" name="csrf" value="' . h(csrf()) . '">';
}

function check_csrf(): void {
  $t = $_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF'] ?? '';
  if (!is_string($t) || !hash_equals(csrf(), $t)) {
    http_response_code(400);
    exit('Your session expired. Go back, reload the page and try again.');
  }
}

function too_many_attempts(): bool {
  $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND created_at > ?');
  $st->execute([client_ip(), gmdate('Y-m-d H:i:s', time() - 900)]);
  return (int) $st->fetchColumn() >= 8;
}

function record_attempt(): void {
  db()->prepare('INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)')->execute([client_ip(), now()]);
  db()->prepare('DELETE FROM login_attempts WHERE created_at < ?')->execute([gmdate('Y-m-d H:i:s', time() - 86400)]);
}

// ---------------- activity log ----------------

function log_activity(?int $appId, string $action, string $detail = '', bool $ok = true): void {
  $who = current_user()['email'] ?? null;
  db()->prepare('INSERT INTO activity (app_id, who, action, detail, ok, created_at) VALUES (?,?,?,?,?,?)')
    ->execute([$appId, $who, $action, mb_substr($detail, 0, 4000), $ok ? 1 : 0, now()]);
}

// ---------------- flash messages ----------------

function flash(string $msg, string $kind = 'ok'): void {
  start_session();
  $_SESSION['flash'][] = [$kind, $msg];
}

function take_flash(): array {
  start_session();
  $f = $_SESSION['flash'] ?? [];
  unset($_SESSION['flash']);
  return $f;
}

function redirect(string $to): void {
  header('Location: ' . $to, true, 303);
  exit;
}

// ---------------- output ----------------

function h($v): string {
  return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
}

function ago(?string $ts): string {
  if (!$ts) return 'never';
  $t = is_numeric($ts) ? (int) $ts : strtotime($ts . (str_contains($ts, 'T') || str_contains($ts, '+') ? '' : ' UTC'));
  if (!$t) return h($ts);
  $d = time() - $t;
  if ($d < 60) return 'just now';
  if ($d < 3600) return floor($d / 60) . ' min ago';
  if ($d < 86400) return floor($d / 3600) . ' hr ago';
  if ($d < 86400 * 30) {
    $n = (int) floor($d / 86400);
    return $n === 1 ? 'yesterday' : "$n days ago";
  }
  return gmdate('M j, Y', $t);
}

/**
 * The left sidebar. A group opens to show its pages; the group holding the current page starts open.
 * 'on' lists the page_start() $active keys that belong to an item, so detail pages light up their list.
 */
function hq_menu(): array {
  $maps = [];
  foreach (['chamber-managers' => 'Chamber managers', 'business-owners' => 'Business owners', 'super-admin' => 'Super admin'] as $k => $l) {
    $maps[] = ['label' => $l, 'href' => 'index.php?p=mindmaps&m=' . $k];
  }
  return [
    ['label' => 'Home', 'href' => 'index.php', 'on' => ['home']],
    ['heading' => 'Platform'],
    ['label' => 'Chambers', 'on' => ['chambers', 'setup'], 'items' => [
      ['label' => 'All chambers', 'href' => 'index.php?p=chambers'],
      ['label' => 'Live', 'href' => 'index.php?p=chambers&status=live'],
      ['label' => 'Onboarding', 'href' => 'index.php?p=chambers&status=onboarding'],
      ['label' => 'Grace', 'href' => 'index.php?p=chambers&status=grace'],
      ['label' => 'Add a chamber', 'href' => 'index.php?p=chamber_new'],
      ['label' => 'New chamber setup', 'href' => 'index.php?p=setup', 'on' => ['setup']],
    ]],
    ['label' => 'PWAs', 'on' => ['pwas', 'updates', 'push', 'template', 'activity'], 'items' => [
      ['label' => 'Apps', 'href' => 'index.php?p=pwas', 'on' => ['pwas']],
      ['label' => 'Updates', 'href' => 'index.php?p=updates', 'on' => ['updates']],
      ['label' => 'Notifications', 'href' => 'index.php?p=push', 'on' => ['push']],
      ['label' => 'Template', 'href' => 'index.php?p=template', 'on' => ['template']],
      ['label' => 'Activity', 'href' => 'index.php?p=activity', 'on' => ['activity']],
    ]],
    ['heading' => 'Sales and contacts'],
    ['label' => 'Leads', 'on' => ['leads'], 'items' => [
      ['label' => 'Chamber pipeline', 'href' => 'index.php?p=leads&pipeline=chamber'],
      ['label' => 'Sponsor pipeline', 'href' => 'index.php?p=leads&pipeline=sponsor'],
    ]],
    ['label' => 'Contacts', 'on' => ['contacts'], 'items' => [
      ['label' => 'People', 'href' => 'index.php?p=contacts'],
      ['label' => 'Organizations', 'href' => 'index.php?p=orgs'],
    ]],
    ['label' => 'Tasks', 'href' => 'index.php?p=tasks', 'on' => ['tasks']],
    ['label' => 'Announcements', 'href' => 'index.php?p=announce', 'on' => ['announce']],
    ['heading' => 'Knowledge'],
    ['label' => 'Docs', 'on' => ['docs', 'ask'], 'items' => [
      ['label' => 'Docs library', 'href' => 'index.php?p=docs', 'on' => ['docs']],
      ['label' => 'Ask HQ', 'href' => 'index.php?p=ask', 'on' => ['ask']],
      ['label' => 'New doc', 'href' => 'index.php?p=doc_edit'],
    ]],
    ['label' => 'Mind maps', 'on' => ['mindmaps'], 'items' => $maps],
    ['heading' => ''],
    ['label' => 'Settings', 'href' => 'index.php?p=settings', 'on' => ['settings']],
  ];
}

/** Whether a menu link is the page being shown: same ?p= and every other parameter in the link matches. */
function hq_menu_current(string $href): bool {
  parse_str((string) parse_url($href, PHP_URL_QUERY), $q);
  $cur = $_GET + ['p' => 'home'];
  $q += ['p' => 'home'];
  foreach ($q as $k => $v) {
    if ((string) ($cur[$k] ?? '') !== (string) $v) return false;
  }
  // A plain list link (no filters) is not current when the page has a filter or id on it.
  foreach (['status', 'pipeline', 'm', 'id', 'kind', 'folder'] as $k) {
    if (!isset($q[$k]) && isset($cur[$k]) && $cur[$k] !== '') return false;
  }
  return true;
}

function page_start(string $title, string $active = ''): void {
  $u = current_user();
  header('Content-Type: text/html; charset=utf-8');
  header("Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; form-action 'self' https:");
  ?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="csrf" content="<?= h(csrf()) ?>">
<title><?= h($title) ?> · Chamber Loop HQ</title>
<link rel="stylesheet" href="assets/app.css?v=<?= DASH_VERSION . '-' . @filemtime(DASH_ROOT . '/assets/app.css') ?>">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231f5f4a'/><path d='M8 22V10h4v12zm6 0V6h4v16zm6 0v-8h4v8z' fill='white'/></svg>">
</head>
<body class="<?= $u ? 'has-side' : 'no-side' ?>">
<header class="top">
  <a class="brand" href="index.php"><span class="logo" aria-hidden="true"></span>Chamber Loop HQ</a>
  <?php if ($u): ?><button class="menu-btn" type="button" aria-controls="nav" aria-expanded="false">Menu</button><?php endif; ?>
</header>
<?php if ($u): ?>
<aside class="side" id="nav" aria-label="Main menu">
  <a class="brand" href="index.php"><span class="logo" aria-hidden="true"></span>Chamber Loop HQ</a>
  <nav class="side-nav">
    <?php foreach (hq_menu() as $it):
      if (isset($it['heading'])): ?>
        <p class="side-head"><?= h($it['heading']) ?></p>
      <?php continue; endif;
      $inGroup = in_array($active, $it['on'] ?? [], true);
      if (empty($it['items'])):
        $on = $inGroup || hq_menu_current($it['href']); ?>
        <a class="side-link<?= $on ? ' on' : '' ?>" href="<?= h($it['href']) ?>"<?= $on ? ' aria-current="page"' : '' ?>><?= h($it['label']) ?></a>
      <?php else: ?>
        <details class="side-group"<?= $inGroup ? ' open' : '' ?>>
          <summary class="side-link<?= $inGroup ? ' in' : '' ?>"><?= h($it['label']) ?></summary>
          <?php
            // Highlight the exact link; failing that, the item whose 'on' keys hold this page; failing that, the first.
            $hit = null;
            foreach ($it['items'] as $i => $sub) if ($hit === null && hq_menu_current($sub['href'])) $hit = $i;
            if ($hit === null && $inGroup) foreach ($it['items'] as $i => $sub) if ($hit === null && in_array($active, $sub['on'] ?? [], true)) $hit = $i;
            if ($hit === null && $inGroup && !isset($it['items'][0]['on'])) $hit = 0;
          ?>
          <div class="side-sub">
            <?php foreach ($it['items'] as $i => $sub): ?>
              <a href="<?= h($sub['href']) ?>"<?= $i === $hit ? ' class="on" aria-current="page"' : '' ?>><?= h($sub['label']) ?></a>
            <?php endforeach; ?>
          </div>
        </details>
      <?php endif; endforeach; ?>
  </nav>
  <form method="post" action="index.php?p=logout" class="side-foot"><?= csrf_field() ?><span class="small muted"><?= h($u['email'] ?? '') ?></span><button class="link small">Sign out</button></form>
</aside>
<?php endif; ?>
<main>
<?php foreach (take_flash() as [$kind, $msg]): ?>
  <div class="flash <?= h($kind) ?>"><?= h($msg) ?></div>
<?php endforeach;
}

function page_end(): void {
  ?></main>
<script src="assets/app.js?v=<?= DASH_VERSION . '-' . @filemtime(DASH_ROOT . '/assets/app.js') ?>"></script>
</body>
</html>
<?php
}

// ---------------- HTTP ----------------

/** @return array{0:int,1:string} status and body */
function http(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 20): array {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => array_merge(['User-Agent: ChamberDashboard/' . DASH_VERSION], $headers),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
  ]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  $out = curl_exec($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  if ($out === false) return [0, $err ?: 'Could not connect'];
  return [$status, (string) $out];
}

require_once __DIR__ . '/mailer.php';
