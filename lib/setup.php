<?php
/**
 * New chamber setup: the step-by-step checklist to follow after duplicating a chamber app.
 * The steps come from the integrations in the Super admin mind map (lib/mindmaps/super-admin.json).
 * Progress is kept per chamber in the setup_checks table. When a new integration or feature
 * needs setting up, add a step here and to the mind map.
 */

declare(strict_types=1);

/**
 * Phases in order. Each step: [key, title, how, where, only_if].
 * key is stored in setup_checks, so never rename one; add a new key instead.
 * only_if is null for steps every chamber needs, or the condition under which it applies.
 */
const SETUP_PHASES = [
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

/** All steps keyed by key, with their phase. */
function setup_steps(): array {
  $out = [];
  foreach (SETUP_PHASES as [$phase, $steps]) {
    foreach ($steps as [$k, $title, $how, $where, $if]) $out[$k] = compact('phase', 'title', 'how', 'where', 'if');
  }
  return $out;
}

/** [key => row] of what is done or skipped for a chamber. */
function setup_checks(int $chamberId): array {
  $out = [];
  foreach (rows('SELECT * FROM setup_checks WHERE chamber_id = ?', [$chamberId]) as $r) $out[$r['step']] = $r;
  return $out;
}

/** [done, total]: skipped steps count as done. */
function setup_progress(int $chamberId): array {
  $steps = setup_steps();
  $done = count(array_intersect_key(setup_checks($chamberId), $steps));
  return [$done, count($steps)];
}

function setup_action(): void {
  $c = row('chambers', (int) ($_POST['id'] ?? 0));
  $step = (string) ($_POST['step'] ?? '');
  $state = (string) ($_POST['state'] ?? '');
  $steps = setup_steps();
  if (!$c || !isset($steps[$step])) {
    flash('That step was not found.', 'err');
    redirect('index.php?p=setup');
  }
  db()->prepare('DELETE FROM setup_checks WHERE chamber_id = ? AND step = ?')->execute([$c['id'], $step]);
  if ($state === 'done' || $state === 'skip') {
    db()->prepare('INSERT INTO setup_checks (chamber_id, step, state, done_at) VALUES (?, ?, ?, ?)')->execute([$c['id'], $step, $state, now()]);
  }
  redirect('index.php?p=setup&id=' . (int) $c['id'] . '#step-' . $step);
}

function setup_screen(): void {
  $c = !empty($_GET['id']) ? row('chambers', (int) $_GET['id']) : null;
  page_start($c ? 'Setup · ' . $c['name'] : 'New chamber setup', 'setup');
  if ($c) setup_chamber($c);
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
    <a class="btn" href="index.php?p=mindmaps&m=super-admin">Super admin map</a>
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
  <?php foreach (SETUP_PHASES as $i => [$phase, $steps]): ?>
    <section class="card setup-phase">
      <h2><?= $i + 1 ?>. <?= h($phase) ?></h2>
      <ol class="setup-steps">
        <?php foreach ($steps as [$k, $title, $how, $where, $if]): ?>
          <li><?php setup_step_text($title, $how, $where, $if); ?></li>
        <?php endforeach; ?>
      </ol>
    </section>
  <?php endforeach;
}

function setup_step_text(string $title, string $how, string $where, ?string $if): void {
  ?>
  <div class="setup-text">
    <strong><?= h($title) ?></strong><?php if ($if): ?> <span class="badge blue">Only if <?= h($if) ?></span><?php endif; ?>
    <p class="small"><?= h($how) ?></p>
    <p class="small muted">Where: <?= h($where) ?></p>
  </div>
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
      <?php if ($c['admin_url']): ?><a class="btn" href="<?= h($c['admin_url']) ?>" target="_blank" rel="noopener">Open admin ↗</a><?php endif; ?>
      <?php if ($b = base44_editor_url($c['base44_app_id'])): ?><a class="btn" href="<?= h($b) ?>" target="_blank" rel="noopener">Base44 editor ↗</a><?php endif; ?>
    </div>
  </div>
  <progress class="setup-bar" max="<?= $total ?>" value="<?= $done ?>"></progress>
  <?php foreach (SETUP_PHASES as $i => [$phase, $steps]):
    $pd = count(array_intersect_key($checks, array_flip(array_column($steps, 0)))); ?>
    <section class="card setup-phase">
      <h2><?= $i + 1 ?>. <?= h($phase) ?> <span class="small muted"><?= $pd ?> of <?= count($steps) ?></span></h2>
      <ol class="setup-steps">
        <?php foreach ($steps as [$k, $title, $how, $where, $if]): $st = $checks[$k]['state'] ?? ''; ?>
          <li id="step-<?= h($k) ?>" class="<?= $st ? 'is-' . h($st) : '' ?>">
            <form method="post" action="index.php?p=setup_mark" class="setup-tick"><?= csrf_field() ?>
              <input type="hidden" name="id" value="<?= (int) $c['id'] ?>"><input type="hidden" name="step" value="<?= h($k) ?>">
              <button name="state" value="<?= $st === 'done' ? '' : 'done' ?>" class="tick" aria-label="<?= $st === 'done' ? 'Mark not done' : 'Mark done' ?>: <?= h($title) ?>"><?= $st === 'done' ? '✓' : '' ?></button>
            </form>
            <?php setup_step_text($title, $how, $where, $if); ?>
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
