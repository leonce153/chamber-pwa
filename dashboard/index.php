<?php
/**
 * Chamber master dashboard. One page script; ?p= picks the screen.
 */

declare(strict_types=1);

require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/chambers.php';

if (!is_set_up()) redirect('setup.php');

$p = (string) ($_GET['p'] ?? 'home');
$post = $_SERVER['REQUEST_METHOD'] === 'POST';

// ---------------- sign in / out ----------------

if ($p === 'login') {
  if (current_user()) redirect('index.php');
  $err = null;
  if ($post) {
    check_csrf();
    if (too_many_attempts()) {
      $err = 'Too many tries. Wait 15 minutes and try again.';
    } else {
      $st = db()->prepare('SELECT * FROM users WHERE email = ?');
      $st->execute([strtolower(trim((string) ($_POST['email'] ?? '')))]);
      $u = $st->fetch();
      if ($u && password_verify((string) ($_POST['password'] ?? ''), $u['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['uid'] = (int) $u['id'];
        db()->prepare('UPDATE users SET last_login_at = ? WHERE id = ?')->execute([now(), $u['id']]);
        redirect('index.php');
      }
      record_attempt();
      $err = 'That email and password do not match.';
    }
  }
  page_start('Sign in');
  ?>
  <section class="card narrow">
    <h1>Sign in</h1>
    <?php if ($err): ?><div class="flash err"><?= h($err) ?></div><?php endif; ?>
    <form method="post" class="stack">
      <?= csrf_field() ?>
      <label>Email <input name="email" type="email" required autocomplete="username" value="<?= h($_POST['email'] ?? '') ?>"></label>
      <label>Password <input name="password" type="password" required autocomplete="current-password"></label>
      <button class="primary">Sign in</button>
    </form>
    <p class="small"><a href="index.php?p=forgot">Forgot your password?</a></p>
  </section>
  <?php
  page_end();
  exit;
}

// ---------------- forgot / reset password ----------------
// The reset token lives in the settings table (pwreset_<user id>), so this works before any
// dashboard database update has been applied.

if ($p === 'forgot') {
  if (current_user()) redirect('index.php');
  $sent = false; $err = null;
  if ($post) {
    check_csrf();
    if (too_many_attempts()) {
      $err = 'Too many tries. Wait 15 minutes and try again.';
    } else {
      record_attempt();
      $st = db()->prepare('SELECT id, email FROM users WHERE email = ?');
      $st->execute([strtolower(trim((string) ($_POST['email'] ?? '')))]);
      if ($u = $st->fetch()) {
        $token = bin2hex(random_bytes(32));
        set_setting('pwreset_' . (int) $u['id'], json_encode(['h' => hash('sha256', $token), 'exp' => time() + 1800]));
        $link = rtrim((string) cfg('base_url', 'https://dashboard.chamberloop.com'), '/') . '/index.php?p=reset&u=' . (int) $u['id'] . '&t=' . $token;
        $from = (string) cfg('mail_from', 'info@chamberloop.com');
        $ok = @mail(
          $u['email'],
          'Reset your Chamber Loop HQ password',
          "Someone asked to reset the password for Chamber Loop HQ (dashboard.chamberloop.com).\n\n"
          . "To choose a new password, open this link within 30 minutes:\n$link\n\n"
          . "If this wasn't you, ignore this email. Your password stays the same.\n",
          "From: Chamber Loop HQ <$from>\r\nContent-Type: text/plain; charset=UTF-8",
          '-f' . $from
        );
        if (!$ok) error_log('Password reset email could not be sent to user ' . (int) $u['id']);
      }
      $sent = true; // same answer either way, so the form doesn't reveal which emails have a login
    }
  }
  page_start('Forgot password');
  ?>
  <section class="card narrow">
    <h1>Forgot your password?</h1>
    <?php if ($err): ?><div class="flash err"><?= h($err) ?></div><?php endif; ?>
    <?php if ($sent): ?>
      <div class="flash">If that email has a login here, a reset link is on its way. It works for 30 minutes. Check spam too.</div>
      <p class="small"><a href="index.php?p=login">Back to sign in</a></p>
    <?php else: ?>
      <p class="muted">Enter the email you sign in with and we'll send you a link to choose a new password.</p>
      <form method="post" class="stack">
        <?= csrf_field() ?>
        <label>Email <input name="email" type="email" required autocomplete="username"></label>
        <button class="primary">Send reset link</button>
      </form>
      <p class="small"><a href="index.php?p=login">Back to sign in</a></p>
    <?php endif; ?>
  </section>
  <?php
  page_end();
  exit;
}

if ($p === 'reset') {
  $uid = (int) ($_GET['u'] ?? 0);
  $token = (string) ($_GET['t'] ?? '');
  $rec = $uid ? json_decode((string) setting('pwreset_' . $uid), true) : null;
  $valid = is_array($rec) && ($rec['exp'] ?? 0) > time() && $token !== '' && hash_equals((string) ($rec['h'] ?? ''), hash('sha256', $token));
  $err = null;
  if ($valid && $post) {
    check_csrf();
    $pw = (string) ($_POST['new'] ?? '');
    if (mb_strlen($pw) < 10) $err = 'Use at least 10 characters.';
    elseif ($pw !== (string) ($_POST['new2'] ?? '')) $err = 'The two passwords do not match.';
    else {
      db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $uid]);
      set_setting('pwreset_' . $uid, null);
      db()->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([client_ip()]);
      flash('Password changed. Sign in with your new password.');
      redirect('index.php?p=login');
    }
  }
  page_start('Choose a new password');
  ?>
  <section class="card narrow">
    <h1>Choose a new password</h1>
    <?php if (!$valid): ?>
      <div class="flash err">This reset link has expired or was already used.</div>
      <p class="small"><a href="index.php?p=forgot">Send a new link</a></p>
    <?php else: ?>
      <?php if ($err): ?><div class="flash err"><?= h($err) ?></div><?php endif; ?>
      <form method="post" class="stack">
        <?= csrf_field() ?>
        <label>New password <input name="new" type="password" required minlength="10" autocomplete="new-password"></label>
        <label>New password again <input name="new2" type="password" required minlength="10" autocomplete="new-password"></label>
        <button class="primary">Save new password</button>
      </form>
    <?php endif; ?>
  </section>
  <?php
  page_end();
  exit;
}

$user = require_login();
if ($post) check_csrf();

// HQ screens (chambers, CRM, docs, Ask HQ) live in lib/hq_pages.php; it exits when it handles $p.
ensure_schema();
require __DIR__ . '/lib/hq.php';
require __DIR__ . '/lib/hq_pages.php';

if ($p === 'logout' && $post) {
  $_SESSION = [];
  session_destroy();
  redirect('index.php?p=login');
}

/** Run $fn for an app, turning errors into a flash message. */
function attempt(callable $fn, ?int $appId, string $action) {
  try {
    return $fn();
  } catch (Throwable $e) {
    log_activity($appId, $action, $e->getMessage(), false);
    flash($e->getMessage(), 'err');
    return null;
  }
}

function app_or_404(): array {
  $a = find_app((int) ($_GET['id'] ?? $_POST['id'] ?? 0));
  if (!$a) {
    flash('That app was not found.', 'err');
    redirect('index.php?p=pwas');
  }
  return $a;
}

function latest_release_safe(): ?array {
  try {
    return list_releases()[0] ?? null;
  } catch (Throwable $e) {
    return null;
  }
}

function build_badge(?array $build, ?array $latest): string {
  if (!$build) return '<span class="badge gray">version unknown</span>';
  $s = '<span class="mono">' . h($build['short'] ?? '?') . '</span>';
  if ($latest && ($build['short'] ?? '') !== $latest['short']) return $s . ' <span class="badge warn">update available</span>';
  if ($latest) return $s . ' <span class="badge ok">up to date</span>';
  return $s;
}

// ---------------- actions ----------------

if ($post) {
  switch ($p) {
    case 'app_save': {
      $id = (int) ($_POST['id'] ?? 0);
      $existing = $id ? find_app($id) : null;
      $name = trim((string) ($_POST['name'] ?? ''));
      $url = normalize_url((string) ($_POST['url'] ?? ''));
      $branch = trim((string) ($_POST['branch'] ?? ''));
      if ($name === '' || !filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^(https://|http://(127\.0\.0\.1|localhost)[:/])#', $url . '/')) {
        flash('Enter a name and an https:// address.', 'err');
        redirect($id ? "index.php?p=app&id=$id&edit=1" : 'index.php?p=app_new');
      }
      if ($branch !== '' && !preg_match('#^[A-Za-z0-9._/-]+$#', $branch)) {
        flash('The branch name can only use letters, numbers, dots, dashes and slashes.', 'err');
        redirect($id ? "index.php?p=app&id=$id&edit=1" : 'index.php?p=app_new');
      }
      $key = preg_replace('/\s+/', '', (string) ($_POST['api_key'] ?? ''));
      $hook = trim((string) ($_POST['deploy_hook'] ?? ''));
      if ($hook !== '' && !preg_match('#^https://[^\s]+$#', $hook)) {
        flash('The deploy webhook must be an https:// address.', 'err');
        redirect($id ? "index.php?p=app&id=$id&edit=1" : 'index.php?p=app_new');
      }
      $tpl = !empty($_POST['is_template']) ? 1 : 0;
      if ($tpl) db()->exec('UPDATE apps SET is_template = 0');
      if ($existing) {
        db()->prepare('UPDATE apps SET name=?, url=?, branch=?, is_template=?, notes=?, api_key=?, deploy_hook=? WHERE id=?')->execute([
          $name, $url, $branch, $tpl, trim((string) ($_POST['notes'] ?? '')) ?: null,
          $key !== '' ? seal($key) : $existing['api_key'],
          !empty($_POST['clear_hook']) ? null : ($hook !== '' ? seal($hook) : $existing['deploy_hook']),
          $id,
        ]);
        log_activity($id, 'Edited app settings');
      } else {
        db()->prepare('INSERT INTO apps (name, url, branch, is_template, notes, api_key, deploy_hook, created_at) VALUES (?,?,?,?,?,?,?,?)')
          ->execute([$name, $url, $branch, $tpl, trim((string) ($_POST['notes'] ?? '')) ?: null, seal($key), seal($hook), now()]);
        $id = (int) db()->lastInsertId();
        log_activity($id, 'Added app', $url);
      }
      $app = find_app($id);
      $ok = attempt(fn() => chamber($app, 'GET', 'site'), $id, 'Connection check');
      if ($ok) flash('Saved. Connected to ' . ($ok['app']['app_name'] ?? $name) . '.');
      redirect("index.php?p=app&id=$id");
    }
    case 'app_delete': {
      $app = app_or_404();
      if (($_POST['confirm'] ?? '') !== 'REMOVE') {
        flash('Type REMOVE to confirm.', 'err');
        redirect("index.php?p=app&id={$app['id']}&edit=1");
      }
      db()->prepare('DELETE FROM apps WHERE id = ?')->execute([$app['id']]);
      db()->prepare('DELETE FROM backups WHERE app_id = ?')->execute([$app['id']]);
      log_activity(null, 'Removed app from dashboard', $app['name'] . ' (' . $app['url'] . ')');
      flash($app['name'] . ' was removed from the dashboard. The app itself was not changed.');
      redirect('index.php?p=pwas');
    }
    case 'app_admin': {
      $app = app_or_404();
      $res = attempt(fn() => chamber($app, 'POST', 'functions/dashboard', ['action' => 'login_link', 'email' => $user['email']]), (int) $app['id'], 'Open admin');
      if ($res && !empty($res['url']) && str_starts_with($res['url'], $app['url'] . '/')) {
        log_activity((int) $app['id'], 'Opened admin');
        header('Location: ' . $res['url'], true, 303);
        exit;
      }
      if ($res) flash('The app returned an unexpected sign-in address.', 'err');
      redirect("index.php?p=app&id={$app['id']}");
    }
    case 'app_migrate': {
      $app = app_or_404();
      $res = attempt(fn() => chamber($app, 'POST', 'functions/dashboard', ['action' => 'migrate']), (int) $app['id'], 'Database updates');
      if ($res !== null) {
        $log = $res['log'] ?? [];
        log_activity((int) $app['id'], 'Applied database updates', $log ? implode('; ', $log) : 'Nothing to change');
        flash($log ? 'Database updated: ' . implode(', ', $log) : 'Database was already up to date.');
      }
      redirect("index.php?p=app&id={$app['id']}");
    }
    case 'app_restore': {
      $app = app_or_404();
      $st = db()->prepare('SELECT * FROM backups WHERE id = ? AND app_id = ?');
      $st->execute([(int) ($_POST['backup_id'] ?? 0), $app['id']]);
      $b = $st->fetch();
      if (!$b) {
        flash('Backup not found.', 'err');
        redirect("index.php?p=app&id={$app['id']}");
      }
      $res = attempt(fn() => restore_backup($app, $b), (int) $app['id'], 'Restore backup');
      if ($res !== null) {
        log_activity((int) $app['id'], 'Restored ' . GROUP_LABELS[$b['grp']], 'Backup #' . $b['id'] . ' from ' . $b['created_at'] . ' UTC');
        flash(GROUP_LABELS[$b['grp']] . ' restored from the backup of ' . $b['created_at'] . ' UTC.');
      }
      redirect("index.php?p=app&id={$app['id']}");
    }
    case 'push': {
      $title = trim((string) ($_POST['title'] ?? ''));
      $body = trim((string) ($_POST['body'] ?? ''));
      $url = trim((string) ($_POST['url'] ?? ''));
      $ids = array_map('intval', (array) ($_POST['apps'] ?? []));
      if ($title === '' || $body === '' || !$ids) {
        flash('Add a title, a message and at least one app.', 'err');
        $_SESSION['push_draft'] = compact('title', 'body', 'url', 'ids');
        redirect('index.php?p=push');
      }
      if ($url !== '' && !preg_match('#^https?://#i', $url)) $url = 'https://' . $url;
      $results = [];
      foreach ($ids as $id) {
        $app = find_app($id);
        if (!$app) continue;
        try {
          $n = send_push($app, $title, $body, $url);
          $results[] = [$app['name'], true, $n === null ? 'Sent' : "Sent to $n subscribers"];
          log_activity($id, 'Sent push', $title . ($n !== null ? " ($n subscribers)" : ''));
        } catch (Throwable $e) {
          $results[] = [$app['name'], false, $e->getMessage()];
          log_activity($id, 'Push failed', $title . ': ' . $e->getMessage(), false);
        }
      }
      $_SESSION['push_results'] = $results;
      redirect('index.php?p=push');
    }
    case 'template_copy': {
      $from = find_app((int) ($_POST['from'] ?? 0));
      $what = (string) ($_POST['what'] ?? '');
      $section = null;
      if (str_starts_with($what, 'section:')) {
        $group = 'home';
        $section = substr($what, 8);
      } else {
        $group = $what;
      }
      $targets = array_map('intval', (array) ($_POST['targets'] ?? []));
      if (!$from || !isset(GROUP_LABELS[$group]) || !$targets) {
        flash('Pick what to copy and at least one app to copy it to.', 'err');
        redirect('index.php?p=template' . ($from ? '&from=' . $from['id'] : ''));
      }
      if (($_POST['confirm'] ?? '') !== '1') {
        flash('Tick the box to confirm. Copying replaces that part of each chosen app (a backup is saved first).', 'err');
        redirect('index.php?p=template&from=' . $from['id']);
      }
      $title = trim((string) ($_POST['section_title'] ?? ''));
      $what = $section ? ($title !== '' ? 'Home section "' . $title . '"' : 'a Home section') : GROUP_LABELS[$group];
      $results = [];
      foreach ($targets as $tid) {
        $to = find_app($tid);
        if (!$to || $tid === (int) $from['id']) continue;
        try {
          $r = copy_content($from, $to, $group, $section);
          $imgs = (int) ($r['images_copied'] ?? 0);
          $results[] = [$to['name'], true, 'Copied' . ($imgs ? ", $imgs images" : '')];
          log_activity($tid, "Copied $what", 'From ' . $from['name']);
        } catch (Throwable $e) {
          $results[] = [$to['name'], false, $e->getMessage()];
          log_activity($tid, "Copy of $what failed", $e->getMessage(), false);
        }
      }
      $_SESSION['copy_results'] = [$what, $results];
      redirect('index.php?p=template&from=' . $from['id']);
    }
    case 'settings': {
      $tok = trim((string) ($_POST['github_token'] ?? ''));
      if ($tok !== '') set_setting('github_token', seal($tok));
      $repo = trim((string) ($_POST['github_repo'] ?? ''));
      if ($repo !== '' && preg_match('#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repo)) set_setting('github_repo', $repo);
      $rb = trim((string) ($_POST['releases_branch'] ?? ''));
      if ($rb !== '' && preg_match('#^[A-Za-z0-9._/-]+$#', $rb)) set_setting('releases_branch', $rb);
      unset($_SESSION['rel_cache']);
      if ($tok !== '') {
        try {
          $r = gh('GET', 'repos/' . github_repo());
          flash($r ? 'GitHub connected to ' . $r['full_name'] . '.' : 'Saved, but GitHub could not find ' . github_repo() . '. Check the token has access to it.', $r ? 'ok' : 'err');
        } catch (Throwable $e) {
          flash('Saved, but GitHub said: ' . $e->getMessage(), 'err');
        }
      } else {
        flash('Settings saved.');
      }
      log_activity(null, 'Changed settings');
      redirect('index.php?p=settings');
    }
    case 'password': {
      $st = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
      $st->execute([$user['id']]);
      $pw = (string) ($_POST['new'] ?? '');
      if (!password_verify((string) ($_POST['current'] ?? ''), (string) $st->fetchColumn())) {
        flash('Your current password is not right.', 'err');
      } elseif (strlen($pw) < 10 || $pw !== (string) ($_POST['new2'] ?? '')) {
        flash('New password must be at least 10 characters and match.', 'err');
      } else {
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $user['id']]);
        log_activity(null, 'Changed password');
        flash('Password changed.');
      }
      redirect('index.php?p=settings');
    }
  }
  http_response_code(404);
  exit('Unknown action');
}

// ---------------- screens ----------------

switch ($p) {

  case 'pwas': {
    $apps = all_apps();
    $sum = fetch_summaries($apps);
    $latest = latest_release_safe();
    page_start('PWAs', 'pwas');
    ?>
    <div class="head">
      <h1>Chamber PWAs</h1>
      <a class="btn primary" href="index.php?p=app_new">Add an app</a>
    </div>
    <?php if (!$apps): ?>
      <section class="card empty">
        <h2>No apps yet</h2>
        <p>Add Muleshoe first: you'll need its address and its dashboard API key (on the app's <span class="mono">/install.php</span> page).</p>
        <a class="btn primary" href="index.php?p=app_new">Add an app</a>
      </section>
    <?php endif; ?>
    <?php if ($latest): ?>
      <p class="muted small">Newest release: <span class="mono"><?= h($latest['short']) ?></span> · <?= h($latest['title']) ?> · <?= ago($latest['date']) ?></p>
    <?php endif; ?>
    <div class="grid">
      <?php foreach ($apps as $a):
        $s = $sum[$a['id']] ?? ['ok' => false, 'error' => '?'];
        $d = $s['data'] ?? [];
        $c = $d['counts'] ?? [];
        $logo = $d['app']['icon_url'] ?? $d['app']['logo_url'] ?? null;
        ?>
        <article class="card app">
          <header>
            <?php if ($logo): ?><img class="applogo" src="<?= h(str_starts_with($logo, 'http') ? $logo : $a['url'] . $logo) ?>" alt=""><?php else: ?><span class="applogo ph"></span><?php endif; ?>
            <div>
              <h2><a href="index.php?p=app&id=<?= (int) $a['id'] ?>"><?= h($a['name']) ?></a><?php if ($a['is_template']): ?> <span class="badge blue">template</span><?php endif; ?></h2>
              <a class="muted small" href="<?= h($a['url']) ?>" target="_blank" rel="noopener"><?= h(app_host($a)) ?></a>
            </div>
            <span class="dot <?= $s['ok'] ? 'up' : 'down' ?>" title="<?= $s['ok'] ? 'Online' : h($s['error']) ?>"></span>
          </header>
          <?php if ($s['ok']): ?>
            <dl class="stats">
              <div><dt>Pushes sent</dt><dd><?= (int) ($c['notifications_sent'] ?? 0) ?></dd></div>
              <div><dt>Banner views</dt><dd><?= number_format((int) ($c['banner_views'] ?? 0)) ?></dd></div>
              <div><dt>Banner taps</dt><dd><?= number_format((int) ($c['banner_taps'] ?? 0)) ?></dd></div>
              <div><dt>Team</dt><dd><?= (int) ($c['team_members'] ?? 0) ?></dd></div>
            </dl>
            <p class="small">Version <?= build_badge($d['build'] ?? null, $latest) ?></p>
            <p class="small muted">Last push: <?= !empty($d['last_notification']) ? h($d['last_notification']['title']) . ' · ' . ago($d['last_notification']['sent_at']) : 'none yet' ?><?= empty($d['push_configured']) ? ' · <span class="badge warn">push not set up</span>' : '' ?></p>
          <?php else: ?>
            <p class="flash err small">Can't reach it: <?= h($s['error']) ?></p>
          <?php endif; ?>
          <footer>
            <a class="btn" href="index.php?p=app&id=<?= (int) $a['id'] ?>">Manage</a>
            <form method="post" action="index.php?p=app_admin" target="_blank" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $a['id'] ?>"><button class="btn">Open admin ↗</button></form>
          </footer>
        </article>
      <?php endforeach; ?>
    </div>
    <?php
    page_end();
    break;
  }

  case 'app_new':
  case 'app': {
    $app = $p === 'app' ? app_or_404() : null;
    $edit = !$app || !empty($_GET['edit']);
    $summary = null;
    $err = null;
    if ($app) {
      try {
        $summary = chamber($app, 'GET', 'site');
      } catch (Throwable $e) {
        $err = $e->getMessage();
      }
    }
    $latest = latest_release_safe();
    page_start($app ? $app['name'] : 'Add an app', 'pwas');
    if ($app): ?>
      <div class="head">
        <div>
          <p class="crumbs"><a href="index.php">Apps</a> /</p>
          <h1><?= h($app['name']) ?><?php if ($app['is_template']): ?> <span class="badge blue">template</span><?php endif; ?></h1>
          <a class="muted" href="<?= h($app['url']) ?>" target="_blank" rel="noopener"><?= h($app['url']) ?> ↗</a>
        </div>
        <div class="row">
          <form method="post" action="index.php?p=app_admin" target="_blank" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $app['id'] ?>"><button class="btn primary">Open admin ↗</button></form>
          <a class="btn" href="index.php?p=app&id=<?= (int) $app['id'] ?>&edit=1">Connection settings</a>
        </div>
      </div>
      <?php if ($err): ?><div class="flash err">Can't reach this app: <?= h($err) ?></div><?php endif; ?>
      <?php if ($summary):
        $c = $summary['counts'] ?? [];
        $b = $summary['build'] ?? null; ?>
        <section class="card">
          <h2>At a glance</h2>
          <dl class="stats wide">
            <div><dt>Home sections</dt><dd><?= (int) ($c['home_sections'] ?? 0) ?></dd></div>
            <div><dt>Banner slides</dt><dd><?= (int) ($c['banner_slides'] ?? 0) ?></dd></div>
            <div><dt>Banner views</dt><dd><?= number_format((int) ($c['banner_views'] ?? 0)) ?></dd></div>
            <div><dt>Banner taps</dt><dd><?= number_format((int) ($c['banner_taps'] ?? 0)) ?></dd></div>
            <div><dt>Pushes sent</dt><dd><?= (int) ($c['notifications_sent'] ?? 0) ?></dd></div>
            <div><dt>Team members</dt><dd><?= (int) ($c['team_members'] ?? 0) ?></dd></div>
          </dl>
          <p>Last push: <?= !empty($summary['last_notification']) ? h($summary['last_notification']['title']) . ' · ' . ago($summary['last_notification']['sent_at']) . ' · ' . (int) $summary['last_notification']['recipients'] . ' subscribers' : 'none yet' ?></p>
          <p>Push notifications: <?= !empty($summary['push_configured']) ? '<span class="badge ok">set up</span>' : '<span class="badge warn">not set up</span> add the Gravitec keys on the app\'s /install.php' ?></p>
        </section>
        <section class="card">
          <h2>Version</h2>
          <p>Running <?= build_badge($b, $latest) ?><?= $b ? ' · ' . h($b['message'] ?? '') . ' · built ' . ago($b['built_at'] ?? null) : '' ?></p>
          <div class="row">
            <a class="btn" href="index.php?p=updates&only=<?= (int) $app['id'] ?>">Update or roll back…</a>
            <form method="post" action="index.php?p=app_migrate" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $app['id'] ?>"><button class="btn">Apply database updates</button></form>
          </div>
          <?php if (!$app['branch'] || !$app['deploy_hook']): ?>
            <p class="small muted">To update this app from here, add its GitHub branch and Hostinger deploy webhook in Connection settings.</p>
          <?php endif; ?>
        </section>
        <section class="card">
          <h2>Send a push to this app</h2>
          <a class="btn" href="index.php?p=push&only=<?= (int) $app['id'] ?>">Write a notification…</a>
        </section>
      <?php endif; ?>
      <?php
      $bk = db()->prepare('SELECT id, grp, label, created_at FROM backups WHERE app_id = ? ORDER BY id DESC LIMIT 15');
      $bk->execute([$app['id']]);
      $backups = $bk->fetchAll();
      if ($backups): ?>
        <section class="card">
          <h2>Content backups</h2>
          <p class="muted small">Saved automatically before the dashboard replaced this app's content.</p>
          <ul class="list">
            <?php foreach ($backups as $bkp): ?>
              <li>
                <span><strong><?= h(GROUP_LABELS[$bkp['grp']] ?? $bkp['grp']) ?></strong> · <?= h($bkp['label']) ?> · <?= ago($bkp['created_at']) ?></span>
                <form method="post" action="index.php?p=app_restore" class="inline confirm" data-confirm="Put this app's <?= h(strtolower(GROUP_LABELS[$bkp['grp']] ?? '')) ?> back the way it was in this backup?"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $app['id'] ?>"><input type="hidden" name="backup_id" value="<?= (int) $bkp['id'] ?>"><button class="btn small">Restore</button></form>
              </li>
            <?php endforeach; ?>
          </ul>
        </section>
      <?php endif;
      $act = db()->prepare('SELECT * FROM activity WHERE app_id = ? ORDER BY id DESC LIMIT 10');
      $act->execute([$app['id']]);
      $acts = $act->fetchAll();
      if ($acts): ?>
        <section class="card">
          <h2>Recent activity</h2>
          <ul class="list"><?php foreach ($acts as $x): ?><li><span><?= $x['ok'] ? '' : '<span class="badge err">failed</span> ' ?><?= h($x['action']) ?><?= $x['detail'] ? ' · <span class="muted">' . h($x['detail']) . '</span>' : '' ?></span><span class="muted small"><?= ago($x['created_at']) ?></span></li><?php endforeach; ?></ul>
        </section>
      <?php endif;
    else: ?>
      <p class="crumbs"><a href="index.php">Apps</a> /</p>
      <h1>Add an app</h1>
    <?php endif;

    if ($edit): ?>
      <section class="card" id="connection">
        <h2><?= $app ? 'Connection settings' : 'Connection' ?></h2>
        <form method="post" action="index.php?p=app_save" class="stack">
          <?= csrf_field() ?>
          <?php if ($app): ?><input type="hidden" name="id" value="<?= (int) $app['id'] ?>"><?php endif; ?>
          <label>Name <input name="name" required value="<?= h($app['name'] ?? '') ?>" placeholder="Muleshoe Chamber"></label>
          <label>App address <input name="url" required value="<?= h($app['url'] ?? '') ?>" placeholder="https://app.muleshoetxchamber.com"></label>
          <label>Dashboard API key <input name="api_key" type="password" autocomplete="off" <?= $app ? 'placeholder="Saved. Leave empty to keep it."' : 'required' ?>>
            <span class="hint">On the app's <span class="mono">/install.php</span> → Dashboard API key → Show key.</span></label>
          <label>GitHub branch this app pulls <input name="branch" value="<?= h($app['branch'] ?? '') ?>" placeholder="site/townname">
            <span class="hint">Muleshoe uses <span class="mono">deploy</span>. New chambers use <span class="mono">site/&lt;town&gt;</span>.</span></label>
          <label>Hostinger deploy webhook <input name="deploy_hook" type="password" autocomplete="off" placeholder="<?= !empty($app['deploy_hook']) ? 'Saved. Leave empty to keep it.' : 'https://webhooks.hostinger.com/deploy/…' ?>">
            <span class="hint">hPanel → this site → Advanced → GIT → Auto Deployment → Webhook URL.</span></label>
          <?php if (!empty($app['deploy_hook'])): ?><label class="check"><input type="checkbox" name="clear_hook" value="1"> Remove the saved webhook</label><?php endif; ?>
          <label class="check"><input type="checkbox" name="is_template" value="1" <?= !empty($app['is_template']) ? 'checked' : '' ?>> This is the template app (the one you edit and copy from)</label>
          <label>Notes <textarea name="notes" rows="2"><?= h($app['notes'] ?? '') ?></textarea></label>
          <div class="row"><button class="primary">Save</button><?php if ($app): ?><a class="btn" href="index.php?p=app&id=<?= (int) $app['id'] ?>">Cancel</a><?php endif; ?></div>
        </form>
      </section>
      <?php if ($app): ?>
        <section class="card danger">
          <h2>Remove from dashboard</h2>
          <p class="muted">This only removes it from this list. The app keeps working.</p>
          <form method="post" action="index.php?p=app_delete" class="row"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $app['id'] ?>"><input name="confirm" placeholder="Type REMOVE" autocomplete="off"><button class="btn">Remove</button></form>
        </section>
      <?php endif;
    endif;
    page_end();
    break;
  }

  case 'updates': {
    $apps = all_apps();
    $only = (int) ($_GET['only'] ?? 0);
    $sum = fetch_summaries($apps);
    $releases = [];
    $gerr = null;
    try {
      $releases = list_releases(!empty($_GET['fresh']));
    } catch (Throwable $e) {
      $gerr = $e->getMessage();
    }
    $latest = $releases[0] ?? null;
    page_start('Updates', 'updates');
    ?>
    <div class="head">
      <h1>Updates</h1>
      <a class="btn" href="index.php?p=updates&fresh=1<?= $only ? '&only=' . $only : '' ?>">Check for new releases</a>
    </div>
    <p class="muted">When I make a change for you, it becomes a new release here. Pick a release, tick the apps, and click Update. Each app pulls it from GitHub, then its database updates are applied. Picking an older release rolls an app back.</p>
    <?php if ($gerr): ?><div class="flash err"><?= h($gerr) ?></div><?php endif; ?>
    <?php if ($releases): ?>
      <section class="card">
        <label>Release
          <select id="release">
            <?php foreach ($releases as $i => $r): ?>
              <option value="<?= h($r['sha']) ?>" data-short="<?= h($r['short']) ?>"><?= h($r['short'] . ' · ' . $r['title'] . ' · ' . ago($r['date'])) ?><?= $i === 0 ? ' (newest)' : '' ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <table class="tbl" id="update-table">
          <thead><tr><th><input type="checkbox" id="check-all" aria-label="Select all"></th><th>App</th><th>Running now</th><th>Status</th></tr></thead>
          <tbody>
          <?php foreach ($apps as $a):
            $b = $sum[$a['id']]['data']['build'] ?? null;
            $ready = $a['branch'] && $a['deploy_hook'] && $a['api_key'];
            $behind = $b && $latest && ($b['short'] ?? '') !== $latest['short']; ?>
            <tr data-id="<?= (int) $a['id'] ?>">
              <td><input type="checkbox" class="pick" value="<?= (int) $a['id'] ?>" <?= !$ready ? 'disabled' : '' ?> <?= $ready && ($only ? $only === (int) $a['id'] : $behind) ? 'checked' : '' ?> aria-label="<?= h($a['name']) ?>"></td>
              <td><a href="index.php?p=app&id=<?= (int) $a['id'] ?>"><?= h($a['name']) ?></a><?= $a['is_template'] ? ' <span class="badge blue">template</span>' : '' ?></td>
              <td><?= build_badge($b, $latest) ?></td>
              <td class="status"><?= $ready ? '' : '<span class="muted small">Add branch + webhook in Connection settings</span>' ?></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
        <div class="row"><button class="primary" id="run-update" type="button">Update selected apps</button><span class="muted small" id="update-note"></span></div>
      </section>
    <?php elseif (!$gerr): ?>
      <section class="card empty"><p>No releases yet. The first one appears after the next change is pushed to GitHub.</p></section>
    <?php endif;
    page_end();
    break;
  }

  case 'push': {
    $apps = all_apps();
    $only = (int) ($_GET['only'] ?? 0);
    $draft = $_SESSION['push_draft'] ?? null;
    $results = $_SESSION['push_results'] ?? null;
    unset($_SESSION['push_draft'], $_SESSION['push_results']);
    page_start('Push', 'push');
    ?>
    <h1>Send a push notification</h1>
    <?php if ($results): ?>
      <section class="card">
        <h2>Results</h2>
        <ul class="list"><?php foreach ($results as [$n, $ok, $msg]): ?><li><span><strong><?= h($n) ?></strong></span><span class="badge <?= $ok ? 'ok' : 'err' ?>"><?= h($msg) ?></span></li><?php endforeach; ?></ul>
      </section>
    <?php endif; ?>
    <section class="card">
      <form method="post" action="index.php?p=push" class="stack confirm" data-confirm="Send this notification now? It goes to everyone subscribed to the apps you ticked.">
        <?= csrf_field() ?>
        <label>Title <input name="title" required maxlength="120" value="<?= h($draft['title'] ?? '') ?>"></label>
        <label>Message <textarea name="body" required maxlength="500" rows="3"><?= h($draft['body'] ?? '') ?></textarea></label>
        <label>Link when tapped (optional) <input name="url" value="<?= h($draft['url'] ?? '') ?>" placeholder="https://"></label>
        <fieldset>
          <legend>Send to</legend>
          <label class="check"><input type="checkbox" id="push-all"> All apps</label>
          <?php foreach ($apps as $a):
            $on = $only ? $only === (int) $a['id'] : in_array((int) $a['id'], $draft['ids'] ?? [], true); ?>
            <label class="check"><input type="checkbox" name="apps[]" class="push-app" value="<?= (int) $a['id'] ?>" <?= $on ? 'checked' : '' ?>> <?= h($a['name']) ?><?= $a['is_template'] ? ' <span class="badge blue">template</span>' : '' ?></label>
          <?php endforeach; ?>
        </fieldset>
        <button class="primary">Send now</button>
      </form>
    </section>
    <?php
    page_end();
    break;
  }

  case 'template': {
    $apps = all_apps();
    $tpl = template_app();
    $from = find_app((int) ($_GET['from'] ?? 0)) ?: $tpl ?: ($apps[0] ?? null);
    $copy = $_SESSION['copy_results'] ?? null;
    unset($_SESSION['copy_results']);
    $sections = [];
    $tabs = [];
    $err = null;
    if ($from) {
      try {
        $home = chamber($from, 'POST', 'functions/dashboard', ['action' => 'export', 'group' => 'home']);
        $sections = $home['rows']['home_sections'] ?? [];
        usort($sections, fn($x, $y) => (int) $x['position'] <=> (int) $y['position']);
        $countBy = [];
        foreach (['home_section_items', 'home_banner_slides', 'home_gallery_photos'] as $t) {
          foreach ($home['rows'][$t] ?? [] as $r) $countBy[$r['section_id']] = ($countBy[$r['section_id']] ?? 0) + 1;
        }
        $t = chamber($from, 'POST', 'functions/dashboard', ['action' => 'export', 'group' => 'tabs']);
        $tabs = $t['rows']['app_features'] ?? [];
        usort($tabs, fn($x, $y) => (int) $x['position'] <=> (int) $y['position']);
      } catch (Throwable $e) {
        $err = $e->getMessage();
      }
    }
    $targets = array_values(array_filter($apps, fn($a) => !$from || (int) $a['id'] !== (int) $from['id']));
    page_start('Template', 'template');
    ?>
    <h1>Template</h1>
    <p class="muted">The template is a real chamber app that you edit with its normal admin. From here you copy its Home screen, a single Home section, or its tabs to one app or to all of them. Each app's current version is backed up first, so you can restore it from that app's page.</p>
    <?php if (!$tpl): ?><div class="flash warn">No template app is marked yet. Open an app's Connection settings and tick "This is the template app".</div><?php endif; ?>
    <?php if ($copy): ?>
      <section class="card">
        <h2>Copied <?= h($copy[0]) ?></h2>
        <ul class="list"><?php foreach ($copy[1] as [$n, $ok, $msg]): ?><li><span><strong><?= h($n) ?></strong></span><span class="badge <?= $ok ? 'ok' : 'err' ?>"><?= h($msg) ?></span></li><?php endforeach; ?></ul>
      </section>
    <?php endif; ?>
    <?php if ($from): ?>
      <section class="card">
        <form method="get" class="row">
          <input type="hidden" name="p" value="template">
          <label>Copy from
            <select name="from" class="autosubmit">
              <?php foreach ($apps as $a): ?><option value="<?= (int) $a['id'] ?>" <?= (int) $a['id'] === (int) $from['id'] ? 'selected' : '' ?>><?= h($a['name']) ?><?= $a['is_template'] ? ' (template)' : '' ?></option><?php endforeach; ?>
            </select>
          </label>
          <noscript><button class="btn">Show</button></noscript>
        </form>
        <form method="post" action="index.php?p=app_admin" target="_blank" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $from['id'] ?>"><button class="btn">Edit <?= h($from['name']) ?> in its admin ↗</button></form>
      </section>
      <?php if ($err): ?><div class="flash err"><?= h($err) ?></div><?php else: ?>
      <form method="post" action="index.php?p=template_copy" class="card stack" id="copy-form">
        <?= csrf_field() ?>
        <input type="hidden" name="from" value="<?= (int) $from['id'] ?>">
        <input type="hidden" name="section_title" id="section-title" value="">
        <h2>1. What to copy</h2>
        <label class="check"><input type="radio" name="what" value="home" checked> The whole Home screen (<?= count($sections) ?> sections)</label>
        <?php foreach ($sections as $s): ?>
          <label class="check indent"><input type="radio" name="what" value="section:<?= h($s['id']) ?>" data-title="<?= h($s['title'] ?: $s['type']) ?>"> Only the section <strong><?= h($s['title'] ?: ucfirst((string) $s['type'])) ?></strong> <span class="muted small"><?= h($s['type']) ?><?= isset($countBy[$s['id']]) ? ' · ' . (int) $countBy[$s['id']] . ' items' : '' ?><?= (int) $s['is_visible'] ? '' : ' · hidden' ?></span></label>
        <?php endforeach; ?>
        <label class="check"><input type="radio" name="what" value="tabs"> Tabs and their pages, links and feeds (<?= count($tabs) ?> tabs: <?= h(implode(', ', array_map(fn($t) => $t['name'], $tabs))) ?>)</label>
        <h2>2. Copy to</h2>
        <?php if (!$targets): ?><p class="muted">Add another app first.</p><?php endif; ?>
        <label class="check"><input type="checkbox" id="targets-all"> All apps</label>
        <?php foreach ($targets as $a): ?>
          <label class="check"><input type="checkbox" name="targets[]" class="target" value="<?= (int) $a['id'] ?>"> <?= h($a['name']) ?></label>
        <?php endforeach; ?>
        <h2>3. Confirm</h2>
        <label class="check"><input type="checkbox" name="confirm" value="1" required> I understand this replaces that part of each app I ticked (a backup is saved first). Copying a single section adds it, or replaces it if the app already has it.</label>
        <button class="primary">Copy now</button>
      </form>
      <?php endif; ?>
    <?php else: ?>
      <section class="card empty"><p>Add your apps first.</p></section>
    <?php endif;
    page_end();
    break;
  }

  case 'activity': {
    $rows = db()->query('SELECT a.*, p.name AS app_name FROM activity a LEFT JOIN apps p ON p.id = a.app_id ORDER BY a.id DESC LIMIT 200')->fetchAll();
    page_start('Activity', 'activity');
    ?>
    <h1>Activity</h1>
    <section class="card">
      <?php if (!$rows): ?><p class="muted">Nothing yet.</p><?php endif; ?>
      <table class="tbl">
        <thead><tr><th>When</th><th>App</th><th>What</th></tr></thead>
        <tbody>
        <?php foreach ($rows as $r): ?>
          <tr><td class="nowrap small"><?= ago($r['created_at']) ?></td><td><?= h($r['app_name'] ?? '') ?></td><td><?= $r['ok'] ? '' : '<span class="badge err">failed</span> ' ?><?= h($r['action']) ?><?= $r['detail'] ? '<br><span class="muted small">' . h($r['detail']) . '</span>' : '' ?></td></tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </section>
    <?php
    page_end();
    break;
  }

  case 'settings': {
    $hasToken = (bool) setting('github_token');
    page_start('Settings', 'settings');
    ?>
    <h1>Settings</h1>
    <section class="card">
      <h2>GitHub</h2>
      <p class="muted">The dashboard uses GitHub to move each app to a release. Make a fine-grained token at github.com → Settings → Developer settings → Fine-grained tokens: Repository access "Only select repositories" → <span class="mono">chamber-pwa</span>, Permissions → Contents: Read and write.</p>
      <form method="post" action="index.php?p=settings" class="stack">
        <?= csrf_field() ?>
        <label>GitHub token <input name="github_token" type="password" autocomplete="off" placeholder="<?= $hasToken ? 'Saved. Paste a new one to replace it.' : 'github_pat_…' ?>"></label>
        <label>Repository <input name="github_repo" value="<?= h(github_repo()) ?>"></label>
        <label>Releases branch <input name="releases_branch" value="<?= h(releases_branch()) ?>"></label>
        <button class="primary">Save</button>
      </form>
    </section>
    <?php hq_settings_cards(); ?>
    <section class="card">
      <h2>Your password</h2>
      <p class="muted">Signed in as <?= h($user['email']) ?>.</p>
      <form method="post" action="index.php?p=password" class="stack">
        <?= csrf_field() ?>
        <label>Current password <input name="current" type="password" required autocomplete="current-password"></label>
        <label>New password <input name="new" type="password" required minlength="10" autocomplete="new-password"></label>
        <label>New password again <input name="new2" type="password" required minlength="10" autocomplete="new-password"></label>
        <button class="btn">Change password</button>
      </form>
    </section>
    <section class="card">
      <h2>Dashboard database</h2>
      <form method="post" action="setup.php"><?= csrf_field() ?><button class="btn">Apply dashboard database updates</button></form>
    </section>
    <?php
    page_end();
    break;
  }

  default:
    http_response_code(404);
    page_start('Not found');
    echo '<h1>Not found</h1><p><a href="index.php">Back to Home</a></p>';
    page_end();
}
