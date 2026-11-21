<?php
/**
 * Outgoing email for HQ. When the info@ mailbox password is saved in Settings → Email sending,
 * mail goes through the mailbox's own server (SMTP, smtp.hostinger.com:465), so it is signed
 * (DKIM) and covered by chamberloop.com's SPF and lands in inboxes. Without it, PHP mail() is used.
 *
 * hq_mail() takes the same arguments as PHP's mail(): $subject already encoded if needed, and
 * $headers holding From/Reply-To/MIME headers separated by \r\n.
 */

declare(strict_types=1);

const SMTP_DEFAULT_HOST = 'smtp.hostinger.com';
const SMTP_DEFAULT_PORT = 465;

function smtp_settings(): ?array {
  $pass = unseal(setting('smtp_pass'));
  if (!$pass) return null;
  return [
    'host' => setting('smtp_host') ?: SMTP_DEFAULT_HOST,
    'port' => (int) (setting('smtp_port') ?: SMTP_DEFAULT_PORT),
    'user' => setting('smtp_user') ?: (string) cfg('mail_from', 'info@chamberloop.com'),
    'pass' => $pass,
  ];
}

/** The last SMTP problem, for Settings and logs. */
function smtp_last_error(?string $set = null): ?string {
  static $err = null;
  if (func_num_args()) $err = $set;
  return $err;
}

final class HqSmtp {
  /** @var resource|null */
  private $s = null;

  public function __construct(private array $cfg) {}

  private function read(): array {
    $all = '';
    while (($line = fgets($this->s, 1024)) !== false) {
      $all .= $line;
      if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    if ($all === '') throw new RuntimeException('The mail server closed the connection');
    return [(int) substr($all, 0, 3), trim($all)];
  }

  private function cmd(string $line, array $ok, bool $secret = false): string {
    fwrite($this->s, $line . "\r\n");
    [$code, $text] = $this->read();
    if (!in_array($code, $ok, true)) throw new RuntimeException(($secret ? 'Login' : strtok($line, ' :')) . " refused: $text");
    return $text;
  }

  public function connect(): void {
    if ($this->s) return;
    $c = $this->cfg;
    $tls = $c['port'] === 465;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $c['host']]]);
    $s = @stream_socket_client(($tls ? 'ssl://' : 'tcp://') . $c['host'] . ':' . $c['port'], $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) throw new RuntimeException("Could not reach {$c['host']}:{$c['port']} ($errstr)");
    stream_set_timeout($s, 30);
    $this->s = $s;
    [$code, $text] = $this->read();
    if ($code !== 220) throw new RuntimeException("Mail server said: $text");
    $host = preg_replace('/[^A-Za-z0-9.-]/', '', parse_url((string) cfg('base_url', 'https://dashboard.chamberloop.com'), PHP_URL_HOST) ?: 'localhost');
    $ehlo = $this->cmd("EHLO $host", [250]);
    if (!$tls) {
      if (stripos($ehlo, 'STARTTLS') === false) throw new RuntimeException('The mail server does not offer encryption');
      $this->cmd('STARTTLS', [220]);
      if (!stream_socket_enable_crypto($this->s, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) throw new RuntimeException('Could not start encryption');
      $this->cmd("EHLO $host", [250]);
    }
    // Try AUTH PLAIN first, then AUTH LOGIN; name the mailbox and server if both are refused.
    try {
      $this->cmd('AUTH PLAIN ' . base64_encode("\0{$c['user']}\0{$c['pass']}"), [235], true);
    } catch (RuntimeException $e) {
      try {
        $this->cmd('AUTH LOGIN', [334]);
        $this->cmd(base64_encode($c['user']), [334], true);
        $this->cmd(base64_encode($c['pass']), [235], true);
      } catch (RuntimeException $e2) {
        throw new RuntimeException("Login refused for {$c['user']} at {$c['host']}:{$c['port']}. Check the mailbox address and password. Server said: " . preg_replace('/^Login refused: /', '', $e2->getMessage()));
      }
    }
  }

  public function send(string $from, string $to, string $data): void {
    $this->connect();
    $this->cmd("MAIL FROM:<$from>", [250]);
    $this->cmd("RCPT TO:<$to>", [250, 251]);
    $this->cmd('DATA', [354]);
    $data = preg_replace('/(?<!\r)\n/', "\r\n", $data);
    $data = preg_replace('/^\./m', '..', $data);
    fwrite($this->s, $data . "\r\n.\r\n");
    [$code, $text] = $this->read();
    if ($code !== 250) throw new RuntimeException("Message refused: $text");
  }

  public function reset(): void {
    if ($this->s) { @fwrite($this->s, "QUIT\r\n"); @fclose($this->s); }
    $this->s = null;
  }

  public function __destruct() { $this->reset(); }
}

/** Send one email. Same arguments as PHP mail(). */
function hq_mail(string $to, string $subject, string $body, string $headers): bool {
  $to = trim($to);
  if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
  $from = (string) cfg('mail_from', 'info@chamberloop.com');
  $smtp = smtp_settings();
  if (!$smtp) return @mail($to, $subject, $body, $headers, '-f' . $from);

  static $client = null;
  if (!$client) $client = new HqSmtp($smtp);
  $domain = substr(strrchr($from, '@') ?: '@chamberloop.com', 1);
  $data = "Date: " . date('r') . "\r\nMessage-ID: <" . bin2hex(random_bytes(16)) . "@$domain>\r\nTo: <$to>\r\nSubject: $subject\r\n"
    . trim($headers) . (stripos($headers, 'MIME-Version:') === false ? "\r\nMIME-Version: 1.0" : '') . "\r\n\r\n" . $body;
  for ($try = 1; $try <= 2; $try++) {
    try {
      $client->send($smtp['user'], $to, $data);
      smtp_last_error(null);
      return true;
    } catch (Throwable $e) {
      $client->reset();
      smtp_last_error($e->getMessage());
      error_log('hq_mail: ' . $e->getMessage());
      if (str_starts_with($e->getMessage(), 'Login')) break;
    }
  }
  return false;
}
