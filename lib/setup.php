<?php
/**
 * New chamber setup: the step-by-step checklist to follow after duplicating a chamber app.
 * Steps live in the setup_steps table and are edited in HQ (New chamber setup → Edit steps).
 * SETUP_DEFAULT_PHASES only fills that table the first time. Ticks are kept per chamber in
 * setup_checks, by step_key, so a step's key never changes once made.
 */

declare(strict_types=1);

/**
 * The starting steps: phases in order, each step [key, title, how, where, only_if].
 * Used once to fill setup_steps; edit steps in HQ, not here.
 */
const SETUP_DEFAULT_PHASES = [
  ['Create the app', [
    ['duplicate', 'Duplicate the Core Template', 'Duplicate "ChamberLoop Core Template", not another chamber, so no members, emails or keys come along. Rename the copy to the chamber\'s name.', 'Base44 → ChamberLoop Core Template → Duplicate', null],
    ['hq_record', 'Add the chamber in HQ', 'Add it here with its plan, price, town and Base44 app id. Status stays Onboarding until launch.', 'HQ → Chambers → Add a chamber', null],
    ['profile', 'Chamber profile and branding', 'Name, logo, colors, address, phone and the public contact email.', 'Chamber app → Settings → Chamber Profile & Branding', null],
    ['director', 'Invite the director', 'Invite the chamber director or board president with the director role. Check the role label fits this chamber (for example "Coalition Director / Board Chair").', 'Chamber app → Settings → Team & Roles', null],
    ['domain', 'Connect the chamber domain', 'Point the chamber\'s web address at the Base44 app.', 'Base44 → app Settings → Domains', null],
  ]],
  ['Email', [
    ['emailit_domain', 'Verify the sending domain in Emailit', 'Add the chamber domain in Emailit and add its DNS records so email doesn\'t land in spam.', 'Emailit dashboard → Domains', null],
    ['emailit_keys', 'Add the Emailit keys', 'EMAILIT_API_KEY and EMAILIT_WEBHOOK_SECRET (delivery status), plus EMAIL_UNSUBSCRIBE_SECRET for unsubscribe links. Use new values, never the ones from another chamber.', 'Base44 app secrets', null],
    ['email_delivery', 'Pick Emailit and the from address', 'Set the provider to Emailit and the from name and address (for example info@ the chamber domain).', 'Chamber app → Platform → Integrations → Email Delivery', null],
    ['email_test', 'Send a test email', 'Send yourself a test and check it shows as delivered in Email Activity.', 'Chamber app → Communications → Send an Email', null],
    ['inbound', 'Route inbound email to the Inbox', 'Add the chamber address to Cloudflare Email Routing and the Email Worker, set INBOX_BRIDGE_SECRET in both places, then check the status shows connected.', 'Cloudflare → Email Routing; Chamber app → Platform → Integrations → Inbound Email', null],
  ]],
  ['AI', [
    ['openai', 'Add the OpenAI key', 'Paste the OpenAI key and pick the model. Website AI, Site Text translation and Spanish drafts reuse this key.', 'Chamber app → Platform → Integrations → AI Concierge', null],
    ['website_ai', 'Check the Website AI models', 'Confirm the large and small models for the website builder AI.', 'Chamber app → Platform → Integrations → Website AI', null],
    ['kb', 'Load the knowledge base', 'Upload the chamber\'s documents and FAQs so the AI Concierge answers about this chamber, not the template.', 'Chamber app → AI Concierge → Knowledge Base', null],
    ['concierge_test', 'Ask the Concierge a test question', 'Ask something only this chamber would know and check the answer.', 'Chamber app → AI Concierge → Chat', null],
    ['concierge_brand', 'Brand the Concierge', 'Name, greeting and colors for the chat widget.', 'Chamber app → AI Concierge → Concierge Branding', null],
  ]],
  ['Website and media', [
    ['r2', 'Set image storage', 'Set the R2 bucket or folder and public URL for this chamber so its images don\'t mix with another chamber\'s.', 'Chamber app → Platform → Integrations → Image Storage', null],
    ['alttext', 'Add the alttext.ai key', 'ALTTEXT_AI_API_KEY, for automatic image descriptions.', 'Base44 app secrets', null],
    ['pages', 'Build the pages and theme', 'Apply a website template if starting fresh, then the pages, theme and site text.', 'Chamber app → Website → Website Templates, Pages, Theme, Site Text', null],
    ['legal', 'Privacy and analytics', 'Privacy policy, terms and analytics settings.', 'Chamber app → Settings → Privacy & Analytics', null],
    ['facebook', 'Facebook Auto-Post', 'Build the TinyCommand flow for the chamber\'s Facebook page and paste its webhook URL.', 'Chamber app → Settings → Facebook Auto-Post', 'the chamber has a Facebook page'],
  ]],
  ['Features and members', [
    ['chamber_features', 'Turn chamber features on or off', 'Match the features to the chamber\'s plan. Anything off disappears from the director\'s menu.', 'Chamber app → Platform → Chamber Features', null],
    ['member_features', 'Set member tiers', 'Which Growth Portal features each membership tier gets. The rest show as Add-Ons.', 'Chamber app → Platform → Member Features', null],
    ['limits', 'Billing and limits', 'Email, AI and storage limits for the plan.', 'Chamber app → Platform → Billing & Limits', null],
    ['permissions', 'Check permissions', 'Confirm directors have Website Pages and Theme (manage_website), and add any per-chamber overrides.', 'Chamber app → Platform → Permissions & Super Admins', null],
    ['directory', 'Directory categories', 'Business categories and directory settings.', 'Chamber app → Settings → Directory', null],
    ['import', 'Import members', 'Import the member list and check a few listings.', 'Chamber app → Members → Members & Contacts', null],
    ['portal', 'Member Portal settings', 'Welcome text and what members see first.', 'Chamber app → Settings → Member Portal Settings', null],
  ]],
  ['Optional services', [
    ['stripe', 'Connect Stripe', 'Connect the chamber\'s own Stripe account (STRIPE_SECRET_KEY), add the gateway, then turn Money on in Chamber Features.', 'Chamber app → Settings → Payment Gateways; Base44 app secrets', 'the chamber takes dues or payments online'],
    ['sms', 'Set up text alerts', 'Pick Twilio or Easify, add credentials and the sender number, then turn Text Alerts on.', 'Chamber app → Platform → Integrations → SMS Provider', 'the chamber wants text alerts'],
    ['gobrunch', 'Add GoBrunch keys', 'GOBRUNCH_USER_KEY and GOBRUNCH_PASSWORD_KEY.', 'Base44 app secrets', 'the chamber runs virtual events'],
    ['wordpress', 'Connect WordPress', 'Site URL, user and application password.', 'Chamber app → Platform → Integrations → WordPress', 'the chamber keeps a WordPress site'],
    ['saas', 'Member website domains', 'Set up Cloudflare for SaaS so members can use their own domains.', 'Cloudflare → SSL/TLS → Custom Hostnames', 'the chamber sells member websites'],
  ]],
  ['Connect to HQ and the phone app', [
    ['jobs', 'Check Scheduled Jobs', 'The runScheduledJobs workflow must run hourly, 6 AM to 10 PM Central. Without it newsletters, renewals and reminders never send.', 'Base44 → app Workflows', null],
    ['connector', 'Connect the HQ connector', 'Set HQ_CONNECTOR_KEY in the app, then paste the connector URL and key in the chamber\'s Edit page here. Refresh to check it reads.', 'Base44 app secrets; HQ → this chamber → Edit', null],
    ['pwa', 'Create the phone app (PWA)', 'Create the PWA, then set PWA_PUSH_URL and PWA_PUSH_SECRET in the chamber app and link the PWA on the chamber\'s Edit page.', 'HQ → PWAs → Apps; Base44 app secrets', null],
    ['push_test', 'Send a test push', 'Post an announcement and check it arrives on a phone with the app installed.', 'Chamber app → Communications → Announcements', null],
  ]],
  ['Launch', [
    ['secrets_review', 'Review every secret', 'Open the app secrets and check no value was copied from another chamber.', 'Base44 app secrets', null],
    ['director_test', 'Walk through as the director', 'Sign in as the director and open each menu: nothing should say Muleshoe or the template.', 'Chamber app', null],
    ['training', 'Training guide', 'Check the Training Guide fits this chamber.', 'Chamber app → Platform → Edit Training Guide', null],
    ['publish', 'Publish the app', 'Publish in Base44 once everything above is done.', 'Base44 → Publish', null],
    ['live', 'Mark the chamber Live in HQ', 'Change the status from Onboarding to Live.', 'HQ → this chamber → Edit', null],
  ]],
];

// ---------------------------------------------------------------------
// Steps (stored in setup_steps; edited on the New chamber setup page)
// ---------------------------------------------------------------------

/** Fill setup_steps from SETUP_DEFAULT_PHASES the first time. */
function setup_seed(): void {
  if ((int) db()->query('SELECT COUNT(*) FROM setup_steps')->fetchColumn() > 0) return;
  $ins = db()->prepare('INSERT INTO setup_steps (step_key, phase, phase_pos, position, title, how, where_at, only_if, archived, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
  foreach (SETUP_DEFAULT_PHASES as $pi => [$phase, $steps]) {
    foreach ($steps as $si => [$k, $title, $how, $where, $if]) {
      $ins->execute([$k, $phase, ($pi + 1) * 10, ($si + 1) * 10, $title, $how, $where, $if, now()]);
    }
  }
}

/** Active steps in order. */
function setup_step_rows(): array {
  setup_seed();
  return rows('SELECT * FROM setup_steps WHERE archived = 0 ORDER BY phase_pos, position, id');
}

/** [[phase name, [step rows]], ...] in order. */
function setup_phases(): array {
  $out = [];
  foreach (setup_step_rows() as $r) {
    $i = array_key_last($out);
    if ($i === null || $out[$i][0] !== $r['phase']) $out[] = [$r['phase'], []];
    $out[array_key_last($out)][1][] = $r;
  }
  return $out;
}

/** Active steps keyed by step_key. */
function setup_steps(): array {
  $out = [];
  foreach (setup_step_rows() as $r) $out[$r['step_key']] = $r;
  return $out;
}

/** [key => row] of what is done or skipped for a chamber. */
function setup_checks(int $chamberId): array {
  $out = [];
  foreach (rows('SELECT * FROM setup_checks WHERE chamber_id = ?', [$chamberId]) as $r) $out[$r['step']] = $r;
  return $out;
}

/** [done, total]: skipped steps count as done; removed steps don't count. */
function setup_progress(int $chamberId): array {
  $steps = setup_steps();
  return [count(array_intersect_key(setup_checks($chamberId), $steps)), count($steps)];
}

// ---------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------

function setup_action(string $p): void {
  switch ($p) {
    case 'setup_mark': {
      $c = row('chambers', (int) ($_POST['id'] ?? 0));
      $step = (string) ($_POST['step'] ?? '');
      $state = (string) ($_POST['state'] ?? '');
      if (!$c || !isset(setup_steps()[$step])) {
        flash('That step was not found.', 'err');
        redirect('index.php?p=setup');
      }
      db()->prepare('DELETE FROM setup_checks WHERE chamber_id = ? AND step = ?')->execute([$c['id'], $step]);
      if ($state === 'done' || $state === 'skip') {
        db()->prepare('INSERT INTO setup_checks (chamber_id, step, state, done_at) VALUES (?, ?, ?, ?)')->execute([$c['id'], $step, $state, now()]);
      }
      redirect('index.php?p=setup&id=' . (int) $c['id'] . '#step-' . $step);
    }

    case 'setup_step_save': {
      $id = (int) ($_POST['step_id'] ?? 0);
      $old = $id ? row('setup_steps', $id) : null;
      $title = trim((string) ($_POST['title'] ?? ''));
      $phase = trim((string) ($_POST['phase'] ?? ''));
      if (($_POST['phase'] ?? '') === '__new') $phase = trim((string) ($_POST['new_phase'] ?? ''));
      if ($title === '' || $phase === '') {
        flash('A step needs a title and a phase.', 'err');
        redirect('index.php?p=setup&edit=1' . ($id ? '&step=' . $id : '') . '#editor');
      }
      $fields = [mb_substr($title, 0, 190), trim((string) ($_POST['how'] ?? '')), mb_substr(trim((string) ($_POST['where_at'] ?? '')), 0, 255),
        ($if = trim((string) ($_POST['only_if'] ?? ''))) === '' ? null : mb_substr($if, 0, 190)];
      // Where it goes: the phase's place, or a new phase at the end; a new or moved step goes last in its phase.
      $pp = db()->prepare('SELECT MIN(phase_pos) FROM setup_steps WHERE archived = 0 AND phase = ?');
      $pp->execute([$phase]);
      $phasePos = $pp->fetchColumn();
      if ($phasePos === null || $phasePos === false) $phasePos = (int) db()->query('SELECT COALESCE(MAX(phase_pos), 0) FROM setup_steps')->fetchColumn() + 10;
      $needsPlace = !$old || $old['phase'] !== $phase;
      $mx = db()->prepare('SELECT COALESCE(MAX(position), 0) FROM setup_steps WHERE archived = 0 AND phase = ?');
      $mx->execute([$phase]);
      $position = $needsPlace ? (int) $mx->fetchColumn() + 10 : (int) $old['position'];
      if ($old) {
        db()->prepare('UPDATE setup_steps SET title = ?, how = ?, where_at = ?, only_if = ?, phase = ?, phase_pos = ?, position = ?, updated_at = ? WHERE id = ?')
          ->execute([...$fields, $phase, (int) $phasePos, $position, now(), $id]);
        flash('Step saved.');
      } else {
        $key = 'c' . bin2hex(random_bytes(5));
        db()->prepare('INSERT INTO setup_steps (step_key, phase, phase_pos, position, title, how, where_at, only_if, archived, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)')
          ->execute([$key, $phase, (int) $phasePos, $position, ...$fields, now()]);
        $id = (int) db()->lastInsertId();
        flash('Step added.');
      }
      redirect('index.php?p=setup&edit=1#s' . $id);
    }

    case 'setup_step_move': {
      $r = row('setup_steps', (int) ($_POST['step_id'] ?? 0));
      if ($r) {
        $up = ($_POST['dir'] ?? '') === 'up';
        $sib = rows('SELECT * FROM setup_steps WHERE archived = 0 AND phase = ? AND id <> ? AND ' . ($up ? 'position <= ? ORDER BY position DESC, id DESC' : 'position >= ? ORDER BY position, id') . ' LIMIT 1',
          [$r['phase'], $r['id'], $r['position']]);
        if ($sib) {
          $a = (int) $r['position']; $b = (int) $sib[0]['position'];
          if ($a === $b) $b = $up ? $a - 1 : $a + 1;
          db()->prepare('UPDATE setup_steps SET position = ? WHERE id = ?')->execute([$b, $r['id']]);
          db()->prepare('UPDATE setup_steps SET position = ? WHERE id = ?')->execute([$a, $sib[0]['id']]);
        }
      }
      redirect('index.php?p=setup&edit=1#s' . (int) ($r['id'] ?? 0));
    }

    case 'setup_step_delete': {
      $r = row('setup_steps', (int) ($_POST['step_id'] ?? 0));
      if ($r) {
        db()->prepare('UPDATE setup_steps SET archived = 1, updated_at = ? WHERE id = ?')->execute([now(), $r['id']]);
        flash('Removed "' . $r['title'] . '". Chambers no longer count it.');
      }
      redirect('index.php?p=setup&edit=1');
    }

    case 'setup_phase_save': {
      $old = (string) ($_POST['old'] ?? '');
      $new = mb_substr(trim((string) ($_POST['name'] ?? '')), 0, 120);
      $dir = (string) ($_POST['dir'] ?? '');
      if ($dir === 'up' || $dir === 'down') {
        $names = array_column(setup_phases(), 0);
        $i = array_search($old, $names, true);
        $j = $i === false ? null : ($dir === 'up' ? $i - 1 : $i + 1);
        if ($j !== null && isset($names[$j])) {
          // Renumber all phases in the new order.
          [$names[$i], $names[$j]] = [$names[$j], $names[$i]];
          $st = db()->prepare('UPDATE setup_steps SET phase_pos = ? WHERE phase = ?');
          foreach ($names as $n => $name) $st->execute([($n + 1) * 10, $name]);
        }
        redirect('index.php?p=setup&edit=1#phase-' . md5($old));
      }
      if ($new !== '' && $old !== '') {
        db()->prepare('UPDATE setup_steps SET phase = ? WHERE phase = ?')->execute([$new, $old]);
        flash('Phase renamed.');
      }
      redirect('index.php?p=setup&edit=1#phase-' . md5($new ?: $old));
    }
  }
  redirect('index.php?p=setup');
}

// ---------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------

function setup_screen(): void {
  $c = !empty($_GET['id']) ? row('chambers', (int) $_GET['id']) : null;
  $edit = !$c && !empty($_GET['edit']);
  page_start($c ? 'Setup · ' . $c['name'] : 'New chamber setup', 'setup');
  if ($c) setup_chamber($c);
  elseif ($edit) setup_editor();
  else setup_overview();
  page_end();
}

function setup_overview(): void {
  $chambers = rows("SELECT id, name, status FROM chambers ORDER BY status = 'onboarding' DESC, name");
  ?>
  <div class="head">
    <div>
      <h1>New chamber setup</h1>
      <p class="muted">Follow these steps after duplicating a chamber app so nothing gets left out. Pick a chamber to tick steps off as you go.</p>
    </div>
    <div class="row">
      <a class="btn primary" href="index.php?p=setup&edit=1">Edit steps</a>
      <a class="btn" href="index.php?p=mindmaps&m=super-admin">Super admin map</a>
    </div>
  </div>
  <section class="card">
    <h2>Chambers</h2>
    <?php if (!$chambers): ?>
      <p class="muted">No chambers yet. <a href="index.php?p=chamber_new">Add a chamber</a> first, then come back to work through its setup.</p>
    <?php else: ?>
      <ul class="list">
        <?php foreach ($chambers as $ch): [$d, $t] = setup_progress((int) $ch['id']); ?>
          <li><span><a href="index.php?p=setup&id=<?= (int) $ch['id'] ?>"><?= h($ch['name']) ?></a> <?= badge(...HQ_CHAMBER_STATUS[$ch['status']]) ?></span>
            <span class="setup-mini"><progress max="<?= $t ?>" value="<?= $d ?>"></progress> <span class="small muted"><?= $d ?> of <?= $t ?></span></span></li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
  </section>
  <?php foreach (setup_phases() as $i => [$phase, $steps]): ?>
    <section class="card setup-phase">
      <h2><?= $i + 1 ?>. <?= h($phase) ?></h2>
      <ol class="setup-steps">
        <?php foreach ($steps as $s): ?>
          <li><?php setup_step_text($s); ?></li>
        <?php endforeach; ?>
      </ol>
    </section>
  <?php endforeach;
}

function setup_step_text(array $s): void {
  ?>
  <div class="setup-text">
    <strong><?= h($s['title']) ?></strong><?php if ($s['only_if']): ?> <span class="badge blue">Only if <?= h($s['only_if']) ?></span><?php endif; ?>
    <?php if ($s['how'] !== ''): ?><p class="small"><?= nl2br(h($s['how'])) ?></p><?php endif; ?>
    <?php if ($s['where_at']): ?><p class="small muted">Where: <?= h($s['where_at']) ?></p><?php endif; ?>
  </div>
  <?php
}

/** The edit form for one step; $s is null for a new step. */
function setup_step_form(?array $s, array $phaseNames, string $phase = ''): void {
  $phase = $s['phase'] ?? $phase;
  ?>
  <form method="post" action="index.php?p=setup_step_save" class="stack setup-form"><?= csrf_field() ?>
    <?php if ($s): ?><input type="hidden" name="step_id" value="<?= (int) $s['id'] ?>"><?php endif; ?>
    <label>Step <input name="title" value="<?= h($s['title'] ?? '') ?>" required maxlength="190"></label>
    <label>What to do <textarea name="how" rows="3"><?= h($s['how'] ?? '') ?></textarea></label>
    <label>Where <input name="where_at" value="<?= h($s['where_at'] ?? '') ?>" maxlength="255" placeholder="Chamber app → Settings → …"></label>
    <label>Only if <span class="muted small">(leave empty when every chamber needs it)</span><input name="only_if" value="<?= h($s['only_if'] ?? '') ?>" maxlength="190" placeholder="the chamber takes payments online"></label>
    <label>Phase
      <select name="phase" data-newphase>
        <?php foreach ($phaseNames as $n): ?><option value="<?= h($n) ?>"<?= $n === $phase ? ' selected' : '' ?>><?= h($n) ?></option><?php endforeach; ?>
        <option value="__new"<?= $phase === '__new' ? ' selected' : '' ?>>New phase…</option>
      </select>
    </label>
    <label class="setup-newphase">New phase name <input name="new_phase" maxlength="120"></label>
    <div class="row">
      <button class="primary"><?= $s ? 'Save step' : 'Add step' ?></button>
      <a class="btn" href="index.php?p=setup&edit=1<?= $s ? '#s' . (int) $s['id'] : '' ?>">Cancel</a>
    </div>
  </form>
  <?php
}

function setup_editor(): void {
  $phases = setup_phases();
  $names = array_column($phases, 0);
  $editId = (int) ($_GET['step'] ?? 0);
  $addTo = (string) ($_GET['add'] ?? '');
  ?>
  <p class="crumbs"><a href="index.php?p=setup">← New chamber setup</a></p>
  <div class="head">
    <div>
      <h1>Edit setup steps</h1>
      <p class="muted">Changes apply to every chamber's checklist. Ticks already made stay with their step; a removed step stops counting.</p>
    </div>
    <a class="btn primary" href="index.php?p=setup">Done editing</a>
  </div>
  <?php foreach ($phases as $i => [$phase, $steps]): $anchor = 'phase-' . md5($phase); ?>
    <section class="card setup-phase" id="<?= h($anchor) ?>">
      <div class="setup-phase-head">
        <form method="post" action="index.php?p=setup_phase_save" class="row setup-phase-name"><?= csrf_field() ?>
          <input type="hidden" name="old" value="<?= h($phase) ?>">
          <span class="setup-num"><?= $i + 1 ?>.</span>
          <input name="name" value="<?= h($phase) ?>" aria-label="Phase name" maxlength="120">
          <button class="small">Rename</button>
          <button class="small" name="dir" value="up" aria-label="Move phase up"<?= $i === 0 ? ' disabled' : '' ?>>↑</button>
          <button class="small" name="dir" value="down" aria-label="Move phase down"<?= $i === count($phases) - 1 ? ' disabled' : '' ?>>↓</button>
        </form>
      </div>
      <ol class="setup-steps">
        <?php foreach ($steps as $n => $s): ?>
          <li id="s<?= (int) $s['id'] ?>">
            <?php if ($editId === (int) $s['id']): ?>
              <div class="setup-text" id="editor"><?php setup_step_form($s, $names); ?></div>
            <?php else: ?>
              <?php setup_step_text($s); ?>
              <div class="setup-side small">
                <a class="btn small" href="index.php?p=setup&edit=1&step=<?= (int) $s['id'] ?>#s<?= (int) $s['id'] ?>">Edit</a>
                <form method="post" action="index.php?p=setup_step_move" class="row"><?= csrf_field() ?>
                  <input type="hidden" name="step_id" value="<?= (int) $s['id'] ?>">
                  <button class="small" name="dir" value="up" aria-label="Move up: <?= h($s['title']) ?>"<?= $n === 0 ? ' disabled' : '' ?>>↑</button>
                  <button class="small" name="dir" value="down" aria-label="Move down: <?= h($s['title']) ?>"<?= $n === count($steps) - 1 ? ' disabled' : '' ?>>↓</button>
                </form>
                <form method="post" action="index.php?p=setup_step_delete" class="confirm" data-confirm="Remove this step from every chamber's checklist?"><?= csrf_field() ?>
                  <input type="hidden" name="step_id" value="<?= (int) $s['id'] ?>">
                  <button class="small link">Remove</button>
                </form>
              </div>
            <?php endif; ?>
          </li>
        <?php endforeach; ?>
        <li>
          <?php if ($addTo === $phase): ?>
            <div class="setup-text" id="editor"><?php setup_step_form(null, $names, $phase); ?></div>
          <?php else: ?>
            <a class="small" href="index.php?p=setup&edit=1&add=<?= h(rawurlencode($phase)) ?>#editor">+ Add a step to <?= h($phase) ?></a>
          <?php endif; ?>
        </li>
      </ol>
    </section>
  <?php endforeach; ?>
  <section class="card">
    <h2>Add a new phase</h2>
    <?php if ($addTo === '__new'): ?>
      <div id="editor"><?php setup_step_form(null, $names, '__new'); ?></div>
    <?php else: ?>
      <p class="small"><a href="index.php?p=setup&edit=1&add=__new#editor">+ Start a new phase with its first step</a></p>
    <?php endif; ?>
  </section>
  <?php
}

function setup_chamber(array $c): void {
  $checks = setup_checks((int) $c['id']);
  [$done, $total] = setup_progress((int) $c['id']);
  ?>
  <p class="crumbs"><a href="index.php?p=setup">← New chamber setup</a> · <a href="index.php?p=chamber&id=<?= (int) $c['id'] ?>"><?= h($c['name']) ?></a></p>
  <div class="head">
    <div>
      <h1>Setup: <?= h($c['name']) ?></h1>
      <p class="muted"><?= $done ?> of <?= $total ?> steps done<?= $done === $total ? '. Everything is set up.' : '' ?></p>
    </div>
    <div class="row links">
      <a class="btn" href="index.php?p=setup&edit=1">Edit steps</a>
      <?php if ($c['admin_url']): ?><a class="btn" href="<?= h($c['admin_url']) ?>" target="_blank" rel="noopener">Open admin ↗</a><?php endif; ?>
      <?php if ($b = base44_editor_url($c['base44_app_id'])): ?><a class="btn" href="<?= h($b) ?>" target="_blank" rel="noopener">Base44 editor ↗</a><?php endif; ?>
    </div>
  </div>
  <progress class="setup-bar" max="<?= $total ?>" value="<?= $done ?>"></progress>
  <?php foreach (setup_phases() as $i => [$phase, $steps]):
    $pd = count(array_intersect_key($checks, array_flip(array_column($steps, 'step_key')))); ?>
    <section class="card setup-phase">
      <h2><?= $i + 1 ?>. <?= h($phase) ?> <span class="small muted"><?= $pd ?> of <?= count($steps) ?></span></h2>
      <ol class="setup-steps">
        <?php foreach ($steps as $s): $k = $s['step_key']; $st = $checks[$k]['state'] ?? ''; ?>
          <li id="step-<?= h($k) ?>" class="<?= $st ? 'is-' . h($st) : '' ?>">
            <form method="post" action="index.php?p=setup_mark" class="setup-tick"><?= csrf_field() ?>
              <input type="hidden" name="id" value="<?= (int) $c['id'] ?>"><input type="hidden" name="step" value="<?= h($k) ?>">
              <button name="state" value="<?= $st === 'done' ? '' : 'done' ?>" class="tick" aria-label="<?= $st === 'done' ? 'Mark not done' : 'Mark done' ?>: <?= h($s['title']) ?>"><?= $st === 'done' ? '✓' : '' ?></button>
            </form>
            <?php setup_step_text($s); ?>
            <div class="setup-side small">
              <?php if ($st): ?>
                <span class="muted"><?= $st === 'skip' ? 'Not needed' : 'Done' ?> <?= h(date('M j', strtotime($checks[$k]['done_at'] . ' UTC'))) ?></span>
              <?php endif; ?>
              <?php if ($st !== 'done'): ?>
                <form method="post" action="index.php?p=setup_mark" class="inline"><?= csrf_field() ?>
                  <input type="hidden" name="id" value="<?= (int) $c['id'] ?>"><input type="hidden" name="step" value="<?= h($k) ?>">
                  <button name="state" value="<?= $st === 'skip' ? '' : 'skip' ?>" class="small link"><?= $st === 'skip' ? 'Undo' : 'Not needed' ?></button>
                </form>
              <?php endif; ?>
            </div>
          </li>
        <?php endforeach; ?>
      </ol>
    </section>
  <?php endforeach;
}

/** The setup card on a chamber's page. */
function setup_card(array $c): void {
  [$done, $total] = setup_progress((int) $c['id']);
  ?>
  <section class="card">
    <h2>New chamber setup</h2>
    <progress class="setup-bar" max="<?= $total ?>" value="<?= $done ?>"></progress>
    <p class="small"><?= $done ?> of <?= $total ?> steps done · <a href="index.php?p=setup&id=<?= (int) $c['id'] ?>"><?= $done ? 'Continue the checklist' : 'Start the checklist' ?></a></p>
  </section>
  <?php
}
