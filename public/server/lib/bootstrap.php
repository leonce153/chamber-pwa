<?php
/**
 * Shared start-up for every PHP entry point: config, database, JSON helpers, sessions.
 */

declare(strict_types=1);

define('APP_VERSION', '1.0.0');
define('APP_ROOT', dirname(__DIR__, 2));           // the web root (public_html of the subdomain)
define('DATA_DIR', APP_ROOT . '/data');            // private: config + logs (blocked by .htaccess)
define('UPLOAD_DIR', APP_ROOT . '/uploads');       // public: uploaded images
define('CONFIG_FILE', DATA_DIR . '/config.php');

require_once __DIR__ . '/schema.php';

function config(?string $key = null, $default = null) {
  $cfg = &$GLOBALS['__chamber_config'];
  if ($cfg === null) {
    $cfg = is_file(CONFIG_FILE) ? (require CONFIG_FILE) : [];
    if (!is_array($cfg)) $cfg = [];
  }
  if ($key === null) return $cfg;
  $cur = $cfg;
  foreach (explode('.', $key) as $part) {
    if (!is_array($cur) || !array_key_exists($part, $cur)) return $default;
    $cur = $cur[$part];
  }
  return $cur;
}

/** Forget the loaded config (after install.php rewrites it). */
function config_reload(): void {
  $GLOBALS['__chamber_config'] = null;
}

function is_installed(): bool {
  return is_file(CONFIG_FILE) && config('db.name');
}

date_default_timezone_set('UTC');

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $host = config('db.host', 'localhost');
  $port = (int) config('db.port', 3306);
  $dsn = "mysql:host={$host};port={$port};dbname=" . config('db.name') . ';charset=utf8mb4';
  $pdo = new PDO($dsn, (string) config('db.user'), (string) config('db.pass'), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  $pdo->exec("SET time_zone = '+00:00'");
  return $pdo;
}

// ---------------- helpers ----------------

function uuid4(): string {
  $d = random_bytes(16);
  $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
  $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function is_uuid($v): bool {
  return is_string($v) && (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $v);
}

/** Current time as a MySQL DATETIME(3) string in UTC. */
function now_sql(string $modify = ''): string {
  $d = new DateTimeImmutable('now', new DateTimeZone('UTC'));
  if ($modify) $d = $d->modify($modify);
  return $d->format('Y-m-d H:i:s.v');
}

/** ISO string from the browser → MySQL UTC DATETIME. */
function to_sql_ts($v): ?string {
  if ($v === null || $v === '') return null;
  try {
    $d = new DateTimeImmutable((string) $v, new DateTimeZone('UTC'));
  } catch (Exception $e) {
    throw new ApiException("Invalid date: $v", 400);
  }
  return $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
}

/** MySQL DATETIME → ISO 8601 with offset, like Postgres timestamptz. */
function from_sql_ts(?string $v): ?string {
  if ($v === null) return null;
  $d = new DateTimeImmutable($v, new DateTimeZone('UTC'));
  return $d->format('Y-m-d\TH:i:s.vP');
}

function site_url(): string {
  $u = rtrim((string) config('site_url', ''), '/');
  if ($u) return $u;
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
  return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

class ApiException extends RuntimeException {
  public int $status;
  public function __construct(string $message, int $status = 400) {
    parent::__construct($message);
    $this->status = $status;
  }
}

function json_out($payload, int $status = 200, array $headers = []): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  foreach ($headers as $k => $v) header("$k: $v");
  echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
  exit;
}

function json_body(): array {
  static $body = null;
  if ($body !== null) return $body;
  $raw = file_get_contents('php://input') ?: '';
  $body = $raw === '' ? [] : json_decode($raw, true);
  if (!is_array($body)) $body = [];
  return $body;
}

function client_ip(): string {
  return (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function log_error(string $msg): void {
  @file_put_contents(DATA_DIR . '/error.log', '[' . gmdate('c') . "] $msg\n", FILE_APPEND);
}

/** Simple outbound HTTP (cURL). Returns [status, body]. */
function http_request(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 15, int $maxBytes = 5000000): array {
  $ch = curl_init($url);
  $buf = '';
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 4,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$buf, $maxBytes) {
      $buf .= $chunk;
      return strlen($buf) > $maxBytes ? 0 : strlen($chunk);
    },
  ]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  $ok = curl_exec($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  if ($ok === false && strlen($buf) <= $maxBytes) throw new RuntimeException($err ?: 'Request failed');
  if (strlen($buf) > $maxBytes) throw new RuntimeException('Response too large');
  return [$status, $buf];
}

/** Very small file cache in data/cache. */
function cache_get(string $key, int $ttl) {
  $f = DATA_DIR . '/cache/' . sha1($key) . '.json';
  if (!is_file($f)) return null;
  if ($ttl > 0 && filemtime($f) < time() - $ttl) return null;
  $v = json_decode((string) file_get_contents($f), true);
  return $v;
}
function cache_put(string $key, $value): void {
  $dir = DATA_DIR . '/cache';
  if (!is_dir($dir)) @mkdir($dir, 0750, true);
  @file_put_contents($dir . '/' . sha1($key) . '.json', json_encode($value));
}

// ---------------- sessions ----------------

function start_session(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
  session_name('chamber_sid');
  session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  ini_set('session.gc_maxlifetime', (string) (60 * 60 * 24 * 30));
  $dir = DATA_DIR . '/sessions';
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  if (is_dir($dir) && is_writable($dir)) session_save_path($dir);
  session_start();
}
