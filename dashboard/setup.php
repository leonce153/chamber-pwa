<?php
/**
 * First-run setup: database connection (if not already in data/config.php) and the owner login.
 * Once an owner exists this page only offers "Apply database updates" to a signed-in user.
 */

declare(strict_types=1);

require __DIR__ . '/lib/core.php';

$err = null;
$hasDb = (bool) cfg('db.name');

if (is_set_up()) {
  $u = require_login();
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $log = migrate();
    flash($log ? implode(', ', $log) : 'Database is up to date.');
    redirect('index.php?p=settings');
  }
  redirect('index.php?p=settings');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  check_csrf();
  try {
    $cfg = cfg();
    if (!$hasDb) {
      $cfg['db'] = [
        'host' => trim((string) ($_POST['db_host'] ?? 'localhost')) ?: 'localhost',
        'port' => 3306,
        'name' => trim((string) ($_POST['db_name'] ?? '')),
        'user' => trim((string) ($_POST['db_user'] ?? '')),
        'pass' => (string) ($_POST['db_pass'] ?? ''),
      ];
      if ($cfg['db']['name'] === '' || $cfg['db']['user'] === '') throw new RuntimeException('Enter the database name and user.');
      $pdo = new PDO('mysql:host=' . $cfg['db']['host'] . ';dbname=' . $cfg['db']['name'] . ';charset=utf8mb4', $cfg['db']['user'], $cfg['db']['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
      unset($pdo);
    }
    if (!empty($cfg['setup_code']) && !hash_equals((string) $cfg['setup_code'], trim((string) ($_POST['setup_code'] ?? '')))) {
      throw new RuntimeException('That setup code is not right.');
    }
    if (empty($cfg['secret'])) $cfg['secret'] = base64_encode(random_bytes(32));
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $pw = (string) ($_POST['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Enter a valid email address.');
    if (strlen($pw) < 10) throw new RuntimeException('Use a password of at least 10 characters.');
    if ($pw !== (string) ($_POST['password2'] ?? '')) throw new RuntimeException('The two passwords do not match.');
    unset($cfg['setup_code']);
    write_config($cfg);
    $pdo = new PDO('mysql:host=' . $cfg['db']['host'] . ';dbname=' . $cfg['db']['name'] . ';charset=utf8mb4', $cfg['db']['user'], $cfg['db']['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    foreach (DASH_TABLES as $t => $def) {
      $pdo->exec("CREATE TABLE IF NOT EXISTS `$t` ($def) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
    if ((int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0) throw new RuntimeException('An owner already exists. Sign in instead.');
    $pdo->prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?,?,?)')->execute([$email, password_hash($pw, PASSWORD_DEFAULT), now()]);
    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $pdo->lastInsertId();
    flash('Your dashboard is ready. Add your GitHub token in Settings, then add your apps.');
    redirect('index.php?p=settings');
  } catch (Throwable $e) {
    $err = $e instanceof PDOException ? 'Could not connect to the database: ' . $e->getMessage() : $e->getMessage();
  }
}

page_start('Set up');
?>
<section class="card narrow">
  <h1>Set up your dashboard</h1>
  <p class="muted">This runs once. You'll use this email and password to sign in.</p>
  <?php if ($err): ?><div class="flash err"><?= h($err) ?></div><?php endif; ?>
  <form method="post" class="stack">
    <?= csrf_field() ?>
    <?php if (!$hasDb): ?>
      <h2>Database</h2>
      <p class="muted">From hPanel → Databases → MySQL Databases for this site.</p>
      <label>Database name <input name="db_name" required value="<?= h($_POST['db_name'] ?? '') ?>"></label>
      <label>Database user <input name="db_user" required value="<?= h($_POST['db_user'] ?? '') ?>"></label>
      <label>Database password <input name="db_pass" type="password" autocomplete="new-password"></label>
      <label>Host <input name="db_host" value="<?= h($_POST['db_host'] ?? 'localhost') ?>"></label>
      <h2>Your login</h2>
    <?php endif; ?>
    <?php if (cfg('setup_code')): ?>
      <label>Setup code <input name="setup_code" required autocomplete="off" value="<?= h($_POST['setup_code'] ?? '') ?>"></label>
    <?php endif; ?>
    <label>Email <input name="email" type="email" required autocomplete="username" value="<?= h($_POST['email'] ?? 'leonce153@gmail.com') ?>"></label>
    <label>Password <input name="password" type="password" required minlength="10" autocomplete="new-password"></label>
    <label>Password again <input name="password2" type="password" required minlength="10" autocomplete="new-password"></label>
    <button class="primary">Create my login</button>
  </form>
</section>
<?php
page_end();
