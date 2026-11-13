<?php
/**
 * Sign-in, sessions, roles, invite and password-reset links.
 *
 * Roles (same as the old app): owner > editor > sender > none. Visitors are "anon".
 * A request carrying this site's API key (X-Api-Key header or "Authorization: Bearer <key>")
 * acts as an owner. That is how a future central dashboard will manage each chamber site.
 */

declare(strict_types=1);

const ROLE_RANK = ['anon' => 0, 'none' => 1, 'sender' => 2, 'editor' => 3, 'owner' => 4];

function api_key_from_request(): ?string {
  $k = $_SERVER['HTTP_X_API_KEY'] ?? null;
  if (!$k) {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (stripos($h, 'Bearer ') === 0) $k = trim(substr($h, 7));
  }
  return $k ?: null;
}

/** Who is making this request. */
function actor(): array {
  static $actor = null;
  if ($actor !== null) return $actor;

  $key = api_key_from_request();
  $configured = (string) config('api_key', '');
  if ($key !== null && $configured !== '' && strlen($configured) >= 32) {
    if (hash_equals($configured, $key)) {
      return $actor = ['id' => null, 'role' => 'owner', 'email' => null, 'name' => 'Dashboard', 'api' => true];
    }
    throw new ApiException('Invalid API key', 401);
  }

  start_session();
  $uid = $_SESSION['uid'] ?? null;
  if (!$uid) return $actor = ['id' => null, 'role' => 'anon', 'email' => null, 'name' => null, 'api' => false];

  $st = db()->prepare('SELECT p.id, p.role, p.full_name, u.email FROM profiles p JOIN auth_users u ON u.id = p.id WHERE p.id = ?');
  $st->execute([$uid]);
  $row = $st->fetch();
  if (!$row) {
    unset($_SESSION['uid']);
    return $actor = ['id' => null, 'role' => 'anon', 'email' => null, 'name' => null, 'api' => false];
  }
  $role = isset(ROLE_RANK[$row['role']]) ? $row['role'] : 'none';
  return $actor = ['id' => $row['id'], 'role' => $role, 'email' => $row['email'], 'name' => $row['full_name'], 'api' => false];
}

function role_at_least(string $role): bool {
  return ROLE_RANK[actor()['role']] >= ROLE_RANK[$role];
}

function require_role(string $role, string $message = 'You do not have permission to do that.'): void {
  if (actor()['role'] === 'anon') throw new ApiException('Please sign in again.', 401);
  if (!role_at_least($role)) throw new ApiException($message, 403);
}

function require_signed_in(): void {
  $a = actor();
  if ($a['role'] === 'anon' || $a['api']) throw new ApiException('Please sign in again.', 401);
}

function user_payload(string $id): ?array {
  $st = db()->prepare('SELECT u.id, u.email, u.last_sign_in_at, u.invited_at, p.full_name FROM auth_users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = ?');
  $st->execute([$id]);
  $u = $st->fetch();
  if (!$u) return null;
  return [
    'id' => $u['id'],
    'email' => $u['email'],
    'user_metadata' => ['full_name' => $u['full_name']],
    'last_sign_in_at' => from_sql_ts($u['last_sign_in_at']),
    'invited_at' => from_sql_ts($u['invited_at']),
  ];
}

function find_user_by_email(string $email): ?array {
  $st = db()->prepare('SELECT * FROM auth_users WHERE LOWER(email) = LOWER(?)');
  $st->execute([trim($email)]);
  return $st->fetch() ?: null;
}

/** Create a login + profile. Returns the new id. */
function create_user(string $email, ?string $password, string $role, ?string $fullName = null, bool $invited = false): string {
  $id = uuid4();
  $now = now_sql();
  db()->prepare('INSERT INTO auth_users (id, email, password_hash, full_name, invited_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    ->execute([$id, strtolower(trim($email)), $password ? password_hash($password, PASSWORD_DEFAULT) : null, $fullName, $invited ? $now : null, $now, $now]);
  db()->prepare('INSERT INTO profiles (id, email, full_name, role, is_owner, is_super_admin, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$id, strtolower(trim($email)), $fullName, $role, $role === 'owner' ? 1 : 0, 0, $now, $now]);
  return $id;
}

function sign_in_session(string $userId): void {
  start_session();
  session_regenerate_id(true);
  $_SESSION['uid'] = $userId;
  db()->prepare('UPDATE auth_users SET last_sign_in_at = ? WHERE id = ?')->execute([now_sql(), $userId]);
}

function too_many_attempts(): bool {
  $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND created_at > ?');
  $st->execute([client_ip(), now_sql('-15 minutes')]);
  return (int) $st->fetchColumn() >= 10;
}

function record_attempt(?string $email): void {
  db()->prepare('INSERT INTO login_attempts (id, ip, email, created_at) VALUES (?,?,?,?)')->execute([uuid4(), client_ip(), $email, now_sql()]);
  if (random_int(1, 50) === 1) db()->prepare('DELETE FROM login_attempts WHERE created_at < ?')->execute([now_sql('-1 day')]);
}

/** One-time link token (invite or password reset). Returns the raw token for the email link. */
function create_link_token(string $userId, string $type, string $ttl = '+7 days'): string {
  $raw = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
  db()->prepare('INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, created_at) VALUES (?,?,?,?,?,?)')
    ->execute([uuid4(), $userId, hash('sha256', $raw), $type, now_sql($ttl), now_sql()]);
  return $raw;
}

function link_for(string $token, string $type, ?string $redirectTo): string {
  $base = site_url();
  $target = $base . '/auth/callback';
  if ($redirectTo && str_starts_with($redirectTo, $base . '/')) $target = strtok($redirectTo, '#');
  return $target . '#access_token=' . rawurlencode($token) . '&type=' . rawurlencode($type);
}

// ---------------- endpoints ----------------

function auth_route(string $action): void {
  $b = json_body();
  switch ($action) {
    case 'me': {
      $a = actor();
      json_out(['data' => ['user' => $a['id'] ? user_payload($a['id']) : null]]);
    }
    case 'login': {
      if (too_many_attempts()) throw new ApiException('Too many sign-in attempts. Please wait 15 minutes and try again.', 429);
      $email = trim((string) ($b['email'] ?? ''));
      $user = $email ? find_user_by_email($email) : null;
      $ok = $user && $user['password_hash'] && password_verify((string) ($b['password'] ?? ''), $user['password_hash']);
      if (!$ok) {
        record_attempt($email ?: null);
        throw new ApiException('Invalid login credentials', 400);
      }
      if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE auth_users SET password_hash = ? WHERE id = ?')->execute([password_hash((string) $b['password'], PASSWORD_DEFAULT), $user['id']]);
      }
      sign_in_session($user['id']);
      json_out(['data' => ['user' => user_payload($user['id'])]]);
    }
    case 'logout': {
      start_session();
      $_SESSION = [];
      session_destroy();
      json_out(['data' => ['ok' => true]]);
    }
    case 'verify': {
      $token = (string) ($b['token'] ?? '');
      $st = db()->prepare('SELECT * FROM auth_tokens WHERE token_hash = ?');
      $st->execute([hash('sha256', $token)]);
      $t = $st->fetch();
      if (!$t || $t['used_at'] || $t['expires_at'] < now_sql()) throw new ApiException('This link is invalid or has expired.', 400);
      db()->prepare('UPDATE auth_tokens SET used_at = ? WHERE id = ?')->execute([now_sql(), $t['id']]);
      sign_in_session($t['user_id']);
      json_out(['data' => ['user' => user_payload($t['user_id']), 'type' => $t['type']]]);
    }
    case 'recover': {
      // Always answer the same way so this can't be used to discover emails.
      $email = trim((string) ($b['email'] ?? ''));
      if (too_many_attempts()) throw new ApiException('Too many requests. Please wait 15 minutes and try again.', 429);
      record_attempt($email ?: null);
      $user = $email ? find_user_by_email($email) : null;
      if ($user) {
        $token = create_link_token($user['id'], 'recovery', '+2 hours');
        $link = link_for($token, 'recovery', isset($b['redirectTo']) ? (string) $b['redirectTo'] : null);
        $name = app_name();
        send_mail($user['email'], "Reset your $name admin password",
          "Someone asked to reset the password for your $name admin account.\n\nTo choose a new password, open this link (it works for 2 hours):\n$link\n\nIf you didn't ask for this, you can ignore this email.");
      }
      json_out(['data' => ['ok' => true]]);
    }
    case 'update': {
      require_signed_in();
      $id = actor()['id'];
      if (isset($b['password'])) {
        $pw = (string) $b['password'];
        if (strlen($pw) < 8) throw new ApiException('Password must be at least 8 characters.', 400);
        db()->prepare('UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), now_sql(), $id]);
      }
      $name = $b['data']['full_name'] ?? null;
      if (is_string($name) && trim($name) !== '') {
        $name = mb_substr(trim($name), 0, 120);
        db()->prepare('UPDATE auth_users SET full_name = ? WHERE id = ?')->execute([$name, $id]);
        db()->prepare('UPDATE profiles SET full_name = ?, updated_at = ? WHERE id = ?')->execute([$name, now_sql(), $id]);
      }
      json_out(['data' => ['user' => user_payload($id)]]);
    }
  }
  throw new ApiException('Not found', 404);
}

function app_name(): string {
  try {
    $n = db()->query('SELECT app_name FROM app_settings LIMIT 1')->fetchColumn();
    if ($n) return (string) $n;
  } catch (Throwable $e) {
  }
  return (string) config('chamber.name', 'Chamber');
}

/** Send a plain-text email with PHP mail() (works on Hostinger once the domain's email is set up). */
function send_mail(string $to, string $subject, string $text): bool {
  $from = (string) config('mail_from', '');
  if (!$from) $from = 'no-reply@' . preg_replace('/^(www|app|pwa)\./', '', parse_url(site_url(), PHP_URL_HOST) ?: 'localhost');
  $fromName = app_name();
  $headers = [
    'From: ' . mb_encode_mimeheader($fromName) . " <$from>",
    'Reply-To: ' . (config('mail_reply_to') ?: $from),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  $ok = @mail($to, mb_encode_mimeheader($subject), $text, implode("\r\n", $headers), '-f' . $from);
  if (!$ok) log_error("mail() failed to $to: $subject");
  return (bool) $ok;
}
