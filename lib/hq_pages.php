<?php
/**
 * HQ screens and actions. Included by index.php after sign-in and the CSRF check.
 * Handles its own ?p= values and exits; anything else falls through to the PWA screens.
 *
 * @var string $p     the requested screen or action
 * @var bool   $post  whether this is a POST
 * @var array  $user  the signed-in user
 */

declare(strict_types=1);

const HQ_ACTIONS = ['chamber_save', 'chamber_refresh', 'chamber_delete', 'org_save', 'org_delete', 'contact_save', 'contact_delete',
  'lead_quick', 'lead_save', 'lead_stage', 'lead_delete', 'lead_to_chamber', 'note_add', 'task_save', 'task_done', 'task_delete',
  'doc_save', 'doc_delete', 'ask', 'ask_save_doc', 'hq_settings'];
const HQ_SCREENS = ['home', 'chambers', 'chamber', 'chamber_new', 'leads', 'lead', 'contacts', 'contact', 'orgs', 'org',
  'tasks', 'docs', 'doc', 'doc_edit', 'ask'];

if ($post && in_array($p, HQ_ACTIONS, true)) {
  hq_action($p, $user);
  exit;
}
if (!$post && in_array($p, HQ_SCREENS, true)) {
  hq_screen($p, $user);
  exit;
}

/** Where to go back to after an action: a same-site path from the form, or $fallback. */
function back(string $fallback): string {
  $b = (string) ($_POST['back'] ?? '');
  return preg_match('#^index\.php(\?[A-Za-z0-9_=&%.\-]*)?$#', $b) ? $b : $fallback;
}

function back_field(string $to): string {
  return '<input type="hidden" name="back" value="' . h($to) . '">';
}

function id_or_404(string $table, string $back): array {
  $r = row($table, (int) ($_GET['id'] ?? $_POST['id'] ?? 0));
  if (!$r) {
    flash('That was not found. It may have been deleted.', 'err');
    redirect($back);
  }
  return $r;
}

// =====================================================================
// actions
// =====================================================================

function hq_action(string $p, array $user): void {
  switch ($p) {

    // ---------- chambers ----------
    case 'chamber_save': {
      $id = (int) ($_POST['id'] ?? 0);
      $c = $id ? row('chambers', $id) : null;
      $name = post_str('name', 190);
      if (!$name) {
        flash('Give the chamber a name.', 'err');
        redirect($id ? "index.php?p=chamber&id=$id&edit=1" : 'index.php?p=chamber_new');
      }
      $plan = isset(HQ_PLANS[$_POST['plan'] ?? '']) ? $_POST['plan'] : 'founding';
      $status = isset(HQ_CHAMBER_STATUS[$_POST['status'] ?? '']) ? $_POST['status'] : 'onboarding';
      $price = post_money('monthly_price');
      if ($price === null) $price = (float) HQ_PLANS[$plan][1];
      $b44 = post_str('base44_app_id', 64);
      if ($b44 && !preg_match('/^[a-f0-9]{24}$/i', $b44)) {
        flash('The Base44 app ID is the 24-character code in the app\'s address (e.g. 6a8c85d1bf3d91ec40ae059d).', 'err');
        redirect($id ? "index.php?p=chamber&id=$id&edit=1" : 'index.php?p=chamber_new');
      }
      $connUrl = post_url('connector_url');
      if ($connUrl && !str_starts_with($connUrl, 'https://')) {
        flash('The connector address must start with https://', 'err');
        redirect($id ? "index.php?p=chamber&id=$id&edit=1" : 'index.php?p=chamber_new');
      }
      $key = preg_replace('/\s+/', '', (string) ($_POST['connector_key'] ?? ''));
      $vals = [
        'name' => $name, 'town' => post_str('town', 120), 'state' => post_str('state', 40), 'status' => $status, 'plan' => $plan,
        'monthly_price' => $price, 'sponsor_org_id' => post_int('sponsor_org_id'), 'member_count' => post_int('member_count'),
        'site_url' => post_url('site_url'), 'admin_url' => post_url('admin_url'), 'base44_app_id' => $b44, 'app_id' => post_int('app_id'),
        'connector_url' => $connUrl, 'grace_ends' => post_date('grace_ends'), 'notes' => post_str('notes', 10000),
      ];
      if ($status === 'grace' && !$vals['grace_ends'] && !($c['grace_ends'] ?? null)) $vals['grace_ends'] = gmdate('Y-m-d', time() + 60 * 86400);
      if ($c) {
        $vals['connector_key'] = !empty($_POST['clear_key']) ? null : ($key !== '' ? seal($key) : $c['connector_key']);
        $sets = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($vals)));
        db()->prepare("UPDATE chambers SET $sets, updated_at = ? WHERE id = ?")->execute([...array_values($vals), now(), $id]);
        if ($c['status'] !== $status) add_activity(['chamber_id' => $id, 'org_id' => $c['org_id']], 'system', 'Status changed from ' . HQ_CHAMBER_STATUS[$c['status']][0] . ' to ' . HQ_CHAMBER_STATUS[$status][0] . '.');
        if ($c['plan'] !== $plan) add_activity(['chamber_id' => $id, 'org_id' => $c['org_id']], 'system', 'Plan changed from ' . HQ_PLANS[$c['plan']][0] . ' to ' . HQ_PLANS[$plan][0] . '.');
        log_activity(null, 'Edited chamber', $name);
      } else {
        $vals['connector_key'] = $key !== '' ? seal($key) : null;
        $vals['org_id'] = post_int('org_id') ?: org_find_or_create($name, 'chamber', ['town' => $vals['town'], 'state' => $vals['state'], 'website' => $vals['site_url']]);
        db()->prepare("UPDATE orgs SET kind = 'chamber', updated_at = ? WHERE id = ?")->execute([now(), $vals['org_id']]);
        $cols = implode(', ', array_map(fn($k) => "`$k`", array_keys($vals)));
        db()->prepare("INSERT INTO chambers ($cols, created_at, updated_at) VALUES (" . str_repeat('?,', count($vals)) . "?,?)")->execute([...array_values($vals), now(), now()]);
        $id = (int) db()->lastInsertId();
        add_activity(['chamber_id' => $id, 'org_id' => $vals['org_id']], 'system', 'Chamber added to HQ.');
        log_activity(null, 'Added chamber', $name);
      }
      $c = row('chambers', $id);
      if ($c['connector_url'] && $c['connector_key']) {
        $r = refresh_chamber($c);
        flash($r['ok'] ? 'Saved. The connector answered.' : 'Saved, but the connector check failed: ' . $r['error'], $r['ok'] ? 'ok' : 'err');
      } else {
        flash('Saved.');
      }
      redirect("index.php?p=chamber&id=$id");
    }
    case 'chamber_refresh': {
      $c = id_or_404('chambers', 'index.php?p=chambers');
      $r = refresh_chamber($c);
      flash($r['ok'] ? 'Refreshed.' : 'Refresh failed: ' . $r['error'], $r['ok'] ? 'ok' : 'err');
      redirect(back("index.php?p=chamber&id={$c['id']}"));
    }
    case 'chamber_delete': {
      $c = id_or_404('chambers', 'index.php?p=chambers');
      if (($_POST['confirm'] ?? '') !== 'REMOVE') {
        flash('Type REMOVE to confirm.', 'err');
        redirect("index.php?p=chamber&id={$c['id']}&edit=1");
      }
      db()->prepare('DELETE FROM chambers WHERE id = ?')->execute([$c['id']]);
      log_activity(null, 'Removed chamber from HQ', $c['name']);
      flash($c['name'] . ' was removed from HQ. Its Base44 app and its organization record were not changed.');
      redirect('index.php?p=chambers');
    }

    // ---------- organizations & contacts ----------
    case 'org_save': {
      $id = (int) ($_POST['id'] ?? 0);
      $name = post_str('name', 190);
      if (!$name) {
        flash('Give the organization a name.', 'err');
        redirect(back('index.php?p=orgs'));
      }
      $vals = [$name, isset(HQ_ORG_KINDS[$_POST['kind'] ?? '']) ? $_POST['kind'] : 'prospect', post_str('town', 120), post_str('state', 40),
        post_url('website'), post_int('member_count'), post_str('current_software', 120), post_str('notes', 10000)];
      if ($id && row('orgs', $id)) {
        db()->prepare('UPDATE orgs SET name=?, kind=?, town=?, state=?, website=?, member_count=?, current_software=?, notes=?, updated_at=? WHERE id=?')->execute([...$vals, now(), $id]);
      } else {
        db()->prepare('INSERT INTO orgs (name, kind, town, state, website, member_count, current_software, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute([...$vals, now(), now()]);
        $id = (int) db()->lastInsertId();
      }
      flash('Saved.');
      redirect("index.php?p=org&id=$id");
    }
    case 'org_delete': {
      $o = id_or_404('orgs', 'index.php?p=orgs');
      $inUse = (int) db()->query('SELECT COUNT(*) FROM chambers WHERE org_id = ' . (int) $o['id'] . ' OR sponsor_org_id = ' . (int) $o['id'])->fetchColumn();
      if ($inUse) {
        flash('This organization is linked to a chamber card. Remove or change that first.', 'err');
        redirect("index.php?p=org&id={$o['id']}");
      }
      db()->prepare('UPDATE contacts SET org_id = NULL WHERE org_id = ?')->execute([$o['id']]);
      db()->prepare('UPDATE deals SET org_id = NULL WHERE org_id = ?')->execute([$o['id']]);
      db()->prepare('DELETE FROM orgs WHERE id = ?')->execute([$o['id']]);
      flash($o['name'] . ' was deleted. Its contacts and leads were kept.');
      redirect('index.php?p=orgs');
    }
    case 'contact_save': {
      $id = (int) ($_POST['id'] ?? 0);
      $name = post_str('name', 190);
      $email = post_str('email', 190);
      if (!$name || ($email && !filter_var($email, FILTER_VALIDATE_EMAIL))) {
        flash('Enter a name and, if you have one, a valid email.', 'err');
        redirect(back('index.php?p=contacts'));
      }
      $orgId = post_int('org_id');
      $newOrg = post_str('new_org', 190);
      if ($newOrg) $orgId = org_find_or_create($newOrg);
      $vals = [$orgId, $name, post_str('title', 120), $email ? strtolower($email) : null, post_str('phone', 60), !empty($_POST['do_not_email']) ? 1 : 0, post_str('notes', 10000)];
      if ($id && row('contacts', $id)) {
        db()->prepare('UPDATE contacts SET org_id=?, name=?, title=?, email=?, phone=?, do_not_email=?, notes=?, updated_at=? WHERE id=?')->execute([...$vals, now(), $id]);
      } else {
        db()->prepare('INSERT INTO contacts (org_id, name, title, email, phone, do_not_email, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')->execute([...$vals, now(), now()]);
        $id = (int) db()->lastInsertId();
      }
      flash('Saved.');
      redirect(back("index.php?p=contact&id=$id"));
    }
    case 'contact_delete': {
      $c = id_or_404('contacts', 'index.php?p=contacts');
      db()->prepare('UPDATE deals SET contact_id = NULL WHERE contact_id = ?')->execute([$c['id']]);
      db()->prepare('DELETE FROM contacts WHERE id = ?')->execute([$c['id']]);
      flash($c['name'] . ' was deleted.');
      redirect('index.php?p=contacts');
    }

    // ---------- leads ----------
    case 'lead_quick': {
      try {
        $id = create_lead([
          'organization' => post_str('organization', 190) ?? '', 'name' => post_str('name', 190) ?? '', 'email' => post_str('email', 190) ?? '',
          'phone' => post_str('phone', 60), 'pipeline' => $_POST['pipeline'] ?? 'chamber', 'source' => post_str('source', 60) ?? 'manual',
          'notes' => post_str('notes', 4000),
        ], 'manual');
        flash('Lead added.');
        redirect("index.php?p=lead&id=$id");
      } catch (InvalidArgumentException $e) {
        flash($e->getMessage(), 'err');
        redirect(back('index.php?p=leads'));
      }
    }
    case 'lead_save': {
      $d = id_or_404('deals', 'index.php?p=leads');
      $stages = HQ_PIPELINES[$d['pipeline']]['stages'];
      $stage = isset($stages[$_POST['stage'] ?? '']) ? $_POST['stage'] : $d['stage'];
      $closed = in_array($stage, ['won', 'lost'], true) ? ($d['closed_at'] ?: now()) : null;
      db()->prepare('UPDATE deals SET title=?, stage=?, value_monthly=?, source=?, next_step=?, next_due=?, contact_id=?, closed_at=?, updated_at=? WHERE id=?')->execute([
        post_str('title', 190) ?? $d['title'], $stage, post_money('value_monthly'), post_str('source', 60), post_str('next_step', 255), post_date('next_due'),
        post_int('contact_id'), $closed, now(), $d['id'],
      ]);
      if ($stage !== $d['stage']) add_activity(['deal_id' => $d['id'], 'org_id' => $d['org_id']], 'system', 'Stage: ' . $stages[$d['stage']] . ' → ' . $stages[$stage]);
      flash('Saved.');
      redirect("index.php?p=lead&id={$d['id']}");
    }
    case 'lead_stage': {
      $d = id_or_404('deals', 'index.php?p=leads');
      $stages = HQ_PIPELINES[$d['pipeline']]['stages'];
      $stage = (string) ($_POST['stage'] ?? '');
      if (isset($stages[$stage]) && $stage !== $d['stage']) {
        $closed = in_array($stage, ['won', 'lost'], true) ? now() : null;
        db()->prepare('UPDATE deals SET stage=?, closed_at=?, updated_at=? WHERE id=?')->execute([$stage, $closed, now(), $d['id']]);
        add_activity(['deal_id' => $d['id'], 'org_id' => $d['org_id']], 'system', 'Stage: ' . $stages[$d['stage']] . ' → ' . $stages[$stage]);
      }
      redirect(back('index.php?p=leads&pipeline=' . $d['pipeline']));
    }
    case 'lead_delete': {
      $d = id_or_404('deals', 'index.php?p=leads');
      db()->prepare('DELETE FROM deals WHERE id = ?')->execute([$d['id']]);
      db()->prepare('UPDATE activities SET deal_id = NULL WHERE deal_id = ?')->execute([$d['id']]);
      db()->prepare('UPDATE tasks SET deal_id = NULL WHERE deal_id = ?')->execute([$d['id']]);
      flash('Lead deleted. The organization and contact were kept.');
      redirect('index.php?p=leads&pipeline=' . $d['pipeline']);
    }
    case 'lead_to_chamber': {
      $d = id_or_404('deals', 'index.php?p=leads');
      $o = $d['org_id'] ? row('orgs', (int) $d['org_id']) : null;
      if (!$o) {
        flash('Link this lead to an organization first.', 'err');
        redirect("index.php?p=lead&id={$d['id']}");
      }
      $st = db()->prepare('SELECT id FROM chambers WHERE org_id = ?');
      $st->execute([$o['id']]);
      if ($cid = $st->fetchColumn()) redirect("index.php?p=chamber&id=$cid");
      $plan = 'founding';
      if ((int) $o['member_count'] >= 500) $plan = 'sponsored_large';
      elseif ((int) $o['member_count'] >= 150) $plan = 'sponsored';
      db()->prepare('INSERT INTO chambers (name, town, state, status, plan, monthly_price, org_id, member_count, site_url, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')->execute([
        $o['name'], $o['town'], $o['state'], 'onboarding', $plan, HQ_PLANS[$plan][1], $o['id'], $o['member_count'], $o['website'], now(), now(),
      ]);
      $cid = (int) db()->lastInsertId();
      db()->prepare("UPDATE orgs SET kind = 'chamber', updated_at = ? WHERE id = ?")->execute([now(), $o['id']]);
      if ($d['stage'] !== 'won') db()->prepare("UPDATE deals SET stage = 'won', closed_at = ?, updated_at = ? WHERE id = ?")->execute([now(), now(), $d['id']]);
      add_activity(['chamber_id' => $cid, 'org_id' => $o['id'], 'deal_id' => $d['id']], 'system', 'Won. Chamber card created from the lead.');
      log_activity(null, 'Added chamber', $o['name'] . ' (from a won lead)');
      flash('Chamber card created. Fill in its Base44 app and connector when the app is set up.');
      redirect("index.php?p=chamber&id=$cid&edit=1");
    }

    // ---------- notes & tasks ----------
    case 'note_add': {
      $body = post_str('body', 20000);
      if ($body) {
        add_activity(['org_id' => post_int('org_id'), 'contact_id' => post_int('contact_id'), 'deal_id' => post_int('deal_id'), 'chamber_id' => post_int('chamber_id')], (string) ($_POST['kind'] ?? 'note'), $body);
        foreach (['deals' => 'deal_id', 'orgs' => 'org_id'] as $t => $k) {
          if ($v = post_int($k)) db()->prepare("UPDATE `$t` SET updated_at = ? WHERE id = ?")->execute([now(), $v]);
        }
      }
      redirect(back('index.php'));
    }
    case 'task_save': {
      $title = post_str('title', 255);
      if (!$title) {
        flash('Write what needs doing.', 'err');
        redirect(back('index.php?p=tasks'));
      }
      db()->prepare('INSERT INTO tasks (title, due_date, org_id, deal_id, chamber_id, contact_id, created_at) VALUES (?,?,?,?,?,?,?)')
        ->execute([$title, post_date('due_date'), post_int('org_id'), post_int('deal_id'), post_int('chamber_id'), post_int('contact_id'), now()]);
      flash('Task added.');
      redirect(back('index.php?p=tasks'));
    }
    case 'task_done': {
      $t = id_or_404('tasks', 'index.php?p=tasks');
      $undo = !empty($_POST['undo']);
      db()->prepare('UPDATE tasks SET done_at = ? WHERE id = ?')->execute([$undo ? null : now(), $t['id']]);
      if (!$undo) add_activity(['org_id' => $t['org_id'], 'deal_id' => $t['deal_id'], 'chamber_id' => $t['chamber_id'], 'contact_id' => $t['contact_id']], 'system', 'Done: ' . $t['title']);
      redirect(back('index.php?p=tasks'));
    }
    case 'task_delete': {
      $t = id_or_404('tasks', 'index.php?p=tasks');
      db()->prepare('DELETE FROM tasks WHERE id = ?')->execute([$t['id']]);
      redirect(back('index.php?p=tasks'));
    }

    // ---------- docs ----------
    case 'doc_save': {
      $id = (int) ($_POST['id'] ?? 0);
      $title = post_str('title', 190);
      $body = (string) ($_POST['body'] ?? '');
      if (!$title || trim($body) === '') {
        flash('A doc needs a title and some text.', 'err');
        redirect($id ? "index.php?p=doc_edit&id=$id" : 'index.php?p=doc_edit');
      }
      $folder = post_str('new_folder', 80) ?? post_str('folder', 80) ?? 'General';
      $vals = [$folder, $title, mb_substr($body, 0, 1000000), post_str('tags', 255), !empty($_POST['checked_now']) ? gmdate('Y-m-d') : post_date('last_checked')];
      if ($id && row('docs', $id)) {
        db()->prepare('UPDATE docs SET folder=?, title=?, body=?, tags=?, last_checked=?, updated_at=? WHERE id=?')->execute([...$vals, now(), $id]);
      } else {
        db()->prepare('INSERT INTO docs (folder, title, body, tags, last_checked, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')->execute([...$vals, now(), now()]);
        $id = (int) db()->lastInsertId();
      }
      flash('Doc saved.');
      redirect("index.php?p=doc&id=$id");
    }
    case 'doc_delete': {
      $d = id_or_404('docs', 'index.php?p=docs');
      db()->prepare('DELETE FROM docs WHERE id = ?')->execute([$d['id']]);
      flash('"' . $d['title'] . '" was deleted.');
      redirect('index.php?p=docs');
    }

    // ---------- Ask HQ ----------
    case 'ask': {
      $q = post_str('q', 2000);
      if (!$q) redirect('index.php?p=ask');
      try {
        [$answer, $docs] = ask_hq($q);
        db()->prepare('INSERT INTO ask_log (question, answer, doc_ids, ok, created_at) VALUES (?,?,?,?,?)')
          ->execute([$q, $answer, implode(',', array_column($docs, 'id')), 1, now()]);
      } catch (Throwable $e) {
        db()->prepare('INSERT INTO ask_log (question, answer, ok, created_at) VALUES (?,?,?,?)')->execute([$q, $e->getMessage(), 0, now()]);
        flash($e->getMessage(), 'err');
      }
      redirect('index.php?p=ask&a=' . (int) db()->lastInsertId());
    }
    case 'ask_save_doc': {
      $a = id_or_404('ask_log', 'index.php?p=ask');
      if (!$a['ok']) redirect('index.php?p=ask');
      $title = mb_substr(rtrim($a['question'], '?') , 0, 180);
      db()->prepare('INSERT INTO docs (folder, title, body, tags, last_checked, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
        ->execute(['General', $title, "_Saved from Ask HQ. Check the steps before relying on them._\n\n" . $a['answer'], 'ask-hq', null, now(), now()]);
      $id = (int) db()->lastInsertId();
      flash('Saved as a doc. Edit it to tidy the wording and pick a folder.');
      redirect("index.php?p=doc_edit&id=$id");
    }

    // ---------- settings ----------
    case 'hq_settings': {
      $k = trim((string) ($_POST['openai_api_key'] ?? ''));
      if ($k !== '') set_setting('openai_api_key', seal($k));
      if (!empty($_POST['clear_openai'])) set_setting('openai_api_key', null);
      $m = trim((string) ($_POST['openai_model'] ?? ''));
      if ($m !== '' && preg_match('/^[A-Za-z0-9._:-]{2,60}$/', $m)) set_setting('openai_model', $m);
      if (!empty($_POST['new_lead_secret'])) set_setting('lead_hook_secret', null);
      log_activity(null, 'Changed HQ settings');
      flash('Settings saved.');
      redirect('index.php?p=settings');
    }
  }
}

// =====================================================================
// screens
// =====================================================================

function hq_screen(string $p, array $user): void {
  switch ($p) {

    // ---------- home ----------
    case 'home': {
      $chambers = all_chambers();
      $apps = all_apps();
      $sum = fetch_summaries($apps);
      $latest = latest_release_safe();
      $tasks = rows('SELECT t.*, o.name AS org_name FROM tasks t LEFT JOIN orgs o ON o.id = t.org_id WHERE t.done_at IS NULL AND t.due_date IS NOT NULL AND t.due_date <= ? ORDER BY t.due_date LIMIT 8', [gmdate('Y-m-d')]);
      $followups = rows("SELECT d.*, o.name AS org_name FROM deals d LEFT JOIN orgs o ON o.id = d.org_id WHERE d.stage NOT IN ('won','lost') AND d.next_due IS NOT NULL AND d.next_due <= ? ORDER BY d.next_due LIMIT 8", [gmdate('Y-m-d')]);
      $newLeads = (int) rows("SELECT COUNT(*) AS n FROM deals WHERE stage = 'new' AND created_at >= ?", [gmdate('Y-m-d H:i:s', time() - 7 * 86400)])[0]['n'];
      $flagged = array_filter($chambers, fn($c) => (bool) array_filter(chamber_flags($c), fn($f) => $f[1] !== 'gray'));
      $mrr = array_sum(array_map(fn($c) => in_array($c['status'], ['live', 'grace'], true) ? (float) $c['monthly_price'] : 0, $chambers));
      page_start('Home', 'home');
      ?>
      <div class="head">
        <h1>Today</h1>
        <div class="row">
          <a class="btn" href="index.php?p=leads#quick-add">Add a lead</a>
          <a class="btn primary" href="index.php?p=chamber_new">Add a chamber</a>
        </div>
      </div>
      <dl class="stats wide todo">
        <div><dt>Tasks due</dt><dd><a href="index.php?p=tasks"><?= count($tasks) ?></a></dd></div>
        <div><dt>Follow-ups due</dt><dd><a href="index.php?p=leads"><?= count($followups) ?></a></dd></div>
        <div><dt>New leads (7 days)</dt><dd><a href="index.php?p=leads"><?= $newLeads ?></a></dd></div>
        <div><dt>Chambers needing attention</dt><dd><?= count($flagged) ?></dd></div>
        <div><dt>Monthly revenue</dt><dd><?= money($mrr) ?></dd></div>
      </dl>
      <?php if ($tasks || $followups): ?>
        <section class="card">
          <h2>Due now</h2>
          <ul class="list">
            <?php foreach ($tasks as $t): ?>
              <li><span><?= h($t['title']) ?><?= $t['org_name'] ? ' <span class="muted small">· ' . h($t['org_name']) . '</span>' : '' ?></span>
                <span class="row"><?= due_label($t['due_date']) ?>
                  <form method="post" action="index.php?p=task_done" class="inline"><?= csrf_field() ?><?= back_field('index.php') ?><input type="hidden" name="id" value="<?= (int) $t['id'] ?>"><button class="small">Done</button></form></span></li>
            <?php endforeach; ?>
            <?php foreach ($followups as $d): ?>
              <li><span><a href="index.php?p=lead&id=<?= (int) $d['id'] ?>"><?= h($d['title']) ?></a> <span class="muted small">· <?= h($d['next_step'] ?: 'Follow up') ?></span></span><?= due_label($d['next_due']) ?></li>
            <?php endforeach; ?>
          </ul>
        </section>
      <?php endif; ?>

      <div class="head"><h2 class="section">Chambers</h2><a class="small" href="index.php?p=chambers">All chambers →</a></div>
      <?php if (!$chambers): ?>
        <section class="card empty">
          <h2>No chambers yet</h2>
          <p>Add Muleshoe, Sudan 365 and the Willow Hills demo to start.</p>
          <a class="btn primary" href="index.php?p=chamber_new">Add a chamber</a>
        </section>
      <?php endif; ?>
      <div class="grid">
        <?php
        usort($chambers, fn($a, $b) => count(chamber_flags($b)) <=> count(chamber_flags($a)));
        foreach ($chambers as $c) chamber_card($c);
        ?>
      </div>

      <div class="head"><h2 class="section">PWAs</h2><a class="small" href="index.php?p=pwas">Manage PWAs →</a></div>
      <?php if (!$apps): ?><p class="muted">No PWAs added yet. <a href="index.php?p=app_new">Add one</a>.</p><?php endif; ?>
      <div class="grid compact">
        <?php foreach ($apps as $a):
          $s = $sum[$a['id']] ?? ['ok' => false, 'error' => '?'];
          $d = $s['data'] ?? [];
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
            <p class="small"><?= $s['ok'] ? 'Version ' . build_badge($d['build'] ?? null, $latest, (int) $a['id']) : '<span class="badge err">can\'t reach it</span>' ?></p>
            <footer>
              <form method="post" action="index.php?p=app_admin" target="_blank" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $a['id'] ?>"><button class="btn small">Open admin ↗</button></form>
              <a class="btn small" href="index.php?p=push&only=<?= (int) $a['id'] ?>">Send notification</a>
            </footer>
          </article>
        <?php endforeach; ?>
      </div>
      <?php
      page_end();
      return;
    }

    // ---------- chambers ----------
    case 'chambers': {
      $chambers = all_chambers();
      $plan = (string) ($_GET['plan'] ?? '');
      $status = (string) ($_GET['status'] ?? '');
      if (isset(HQ_PLANS[$plan])) $chambers = array_filter($chambers, fn($c) => $c['plan'] === $plan);
      if (isset(HQ_CHAMBER_STATUS[$status])) $chambers = array_filter($chambers, fn($c) => $c['status'] === $status);
      page_start('Chambers', 'chambers');
      ?>
      <div class="head">
        <h1>Chambers</h1>
        <a class="btn primary" href="index.php?p=chamber_new">Add a chamber</a>
      </div>
      <form class="row filters" method="get">
        <input type="hidden" name="p" value="chambers">
        <select name="plan" class="autosubmit" aria-label="Plan"><option value="">All plans</option><?php foreach (HQ_PLANS as $k => [$l]): ?><option value="<?= h($k) ?>"<?= $k === $plan ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select>
        <select name="status" class="autosubmit" aria-label="Status"><option value="">All statuses</option><?php foreach (HQ_CHAMBER_STATUS as $k => [$l]): ?><option value="<?= h($k) ?>"<?= $k === $status ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select>
        <noscript><button class="small">Filter</button></noscript>
      </form>
      <section class="card">
        <?php if (!$chambers): ?><p class="muted">No chambers match.</p><?php else: ?>
        <table class="tbl">
          <thead><tr><th>Chamber</th><th>Status</th><th>Plan</th><th>Monthly</th><th>Sponsor</th><th>Needs attention</th></tr></thead>
          <tbody>
          <?php foreach ($chambers as $c): ?>
            <tr>
              <td><a href="index.php?p=chamber&id=<?= (int) $c['id'] ?>"><strong><?= h($c['name']) ?></strong></a><br><span class="muted small"><?= h(trim(($c['town'] ?? '') . ', ' . ($c['state'] ?? ''), ', ')) ?></span></td>
              <td><?= badge(...HQ_CHAMBER_STATUS[$c['status']]) ?></td>
              <td class="small"><?= h(HQ_PLANS[$c['plan']][0] ?? $c['plan']) ?></td>
              <td><?= money($c['monthly_price']) ?></td>
              <td class="small"><?= $c['sponsor_org_id'] ? '<a href="index.php?p=org&id=' . (int) $c['sponsor_org_id'] . '">' . h($c['sponsor_name']) . '</a>' : '<span class="muted">none</span>' ?></td>
              <td class="small"><?= implode(' ', array_map(fn($f) => badge($f[0], $f[1]), chamber_flags($c))) ?: '<span class="muted">—</span>' ?></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
        <?php endif; ?>
      </section>
      <?php
      page_end();
      return;
    }

    case 'chamber_new':
    case 'chamber': {
      $c = $p === 'chamber' ? id_or_404('chambers', 'index.php?p=chambers') : null;
      $edit = !$c || !empty($_GET['edit']);
      // Refresh on demand when the card is opened, at most every 10 minutes
      if ($c && !$edit && $c['connector_url'] && (!$c['snapshot_at'] || strtotime($c['snapshot_at'] . ' UTC') < time() - 600)) {
        refresh_chamber($c);
        $c = row('chambers', (int) $c['id']);
      }
      page_start($c ? $c['name'] : 'Add a chamber', 'chambers');
      if ($c && !$edit) chamber_detail($c);
      else chamber_form($c);
      page_end();
      return;
    }

    // ---------- leads ----------
    case 'leads': {
      $pl = isset(HQ_PIPELINES[$_GET['pipeline'] ?? '']) ? $_GET['pipeline'] : 'chamber';
      $view = ($_GET['view'] ?? '') === 'list' ? 'list' : 'board';
      $showClosed = !empty($_GET['closed']);
      $deals = rows("SELECT d.*, o.name AS org_name, c.name AS contact_name FROM deals d LEFT JOIN orgs o ON o.id = d.org_id LEFT JOIN contacts c ON c.id = d.contact_id
        WHERE d.pipeline = ? " . ($showClosed ? '' : "AND (d.stage NOT IN ('won','lost') OR d.closed_at >= ?) ") . 'ORDER BY d.updated_at DESC', $showClosed ? [$pl] : [$pl, gmdate('Y-m-d H:i:s', time() - 30 * 86400)]);
      $stages = HQ_PIPELINES[$pl]['stages'];
      page_start('Leads', 'leads');
      ?>
      <div class="head">
        <h1>Leads</h1>
        <div class="row">
          <?php foreach (HQ_PIPELINES as $k => $def): ?><a class="btn small<?= $k === $pl ? ' primary' : '' ?>" href="index.php?p=leads&pipeline=<?= h($k) ?>&view=<?= h($view) ?>"><?= h($def['label']) ?></a><?php endforeach; ?>
          <a class="btn small" href="index.php?p=leads&pipeline=<?= h($pl) ?>&view=<?= $view === 'board' ? 'list' : 'board' ?>"><?= $view === 'board' ? 'List view' : 'Board view' ?></a>
        </div>
      </div>
      <?php if ($view === 'board'): ?>
        <div class="board">
          <?php foreach ($stages as $sk => $sl):
            $col = array_filter($deals, fn($d) => $d['stage'] === $sk); ?>
            <section class="col">
              <h3><?= h($sl) ?> <span class="muted small"><?= count($col) ?></span></h3>
              <?php foreach ($col as $d): ?>
                <article class="deal">
                  <a href="index.php?p=lead&id=<?= (int) $d['id'] ?>"><strong><?= h($d['title']) ?></strong></a>
                  <?php if ($d['contact_name']): ?><div class="small muted"><?= h($d['contact_name']) ?></div><?php endif; ?>
                  <div class="small"><?= $d['value_monthly'] ? money($d['value_monthly']) . '/mo · ' : '' ?><?= $d['next_step'] ? h($d['next_step']) . ' ' : '' ?><?= due_label($d['next_due']) ?></div>
                  <form method="post" action="index.php?p=lead_stage" class="move"><?= csrf_field() ?><?= back_field("index.php?p=leads&pipeline=$pl") ?><input type="hidden" name="id" value="<?= (int) $d['id'] ?>">
                    <select name="stage" class="autosubmit" aria-label="Move to stage"><?php foreach ($stages as $k2 => $l2): ?><option value="<?= h($k2) ?>"<?= $k2 === $d['stage'] ? ' selected' : '' ?>><?= h($l2) ?></option><?php endforeach; ?></select>
                    <noscript><button class="small">Move</button></noscript>
                  </form>
                </article>
              <?php endforeach; ?>
            </section>
          <?php endforeach; ?>
        </div>
      <?php else: ?>
        <section class="card">
          <table class="tbl">
            <thead><tr><th>Lead</th><th>Stage</th><th>Contact</th><th>Monthly</th><th>Next step</th><th>Source</th><th>Updated</th></tr></thead>
            <tbody>
            <?php foreach ($deals as $d): ?>
              <tr><td><a href="index.php?p=lead&id=<?= (int) $d['id'] ?>"><?= h($d['title']) ?></a></td><td><?= h($stages[$d['stage']] ?? $d['stage']) ?></td><td><?= h($d['contact_name'] ?? '') ?></td>
                <td><?= $d['value_monthly'] ? money($d['value_monthly']) : '' ?></td><td class="small"><?= h($d['next_step'] ?? '') ?> <?= due_label($d['next_due']) ?></td><td class="small"><?= h($d['source'] ?? '') ?></td><td class="small nowrap"><?= ago($d['updated_at']) ?></td></tr>
            <?php endforeach; ?>
            </tbody>
          </table>
        </section>
      <?php endif; ?>
      <p class="small"><a href="index.php?p=leads&pipeline=<?= h($pl) ?>&view=<?= h($view) ?>&closed=<?= $showClosed ? '0' : '1' ?>"><?= $showClosed ? 'Hide' : 'Show' ?> won and lost leads older than 30 days</a></p>
      <section class="card" id="quick-add">
        <h2>Add a lead</h2>
        <form method="post" action="index.php?p=lead_quick" class="grid-form">
          <?= csrf_field() ?><?= back_field("index.php?p=leads&pipeline=$pl") ?>
          <label>Pipeline <select name="pipeline"><?php foreach (HQ_PIPELINES as $k => $def): ?><option value="<?= h($k) ?>"<?= $k === $pl ? ' selected' : '' ?>><?= h($def['label']) ?></option><?php endforeach; ?></select></label>
          <label>Organization <input name="organization" placeholder="e.g. Friona Chamber of Commerce" required></label>
          <label>Contact name <input name="name"></label>
          <label>Email <input name="email" type="email"></label>
          <label>Phone <input name="phone"></label>
          <label>Source <input name="source" value="manual" list="sources"></label>
          <datalist id="sources"><option value="manual"><option value="website demo request"><option value="website contact form"><option value="NotiQ"><option value="referral"><option value="event"></datalist>
          <label class="full">Notes <textarea name="notes" rows="2"></textarea></label>
          <div class="full"><button class="primary">Add lead</button></div>
        </form>
      </section>
      <?php
      page_end();
      return;
    }

    case 'lead': {
      $d = id_or_404('deals', 'index.php?p=leads');
      $o = $d['org_id'] ? row('orgs', (int) $d['org_id']) : null;
      $contacts = $o ? rows('SELECT * FROM contacts WHERE org_id = ? ORDER BY name', [$o['id']]) : ($d['contact_id'] ? [row('contacts', (int) $d['contact_id'])] : []);
      $stages = HQ_PIPELINES[$d['pipeline']]['stages'];
      $chamberId = $o ? (rows('SELECT id FROM chambers WHERE org_id = ?', [$o['id']])[0]['id'] ?? null) : null;
      page_start($d['title'], 'leads');
      ?>
      <p class="crumbs"><a href="index.php?p=leads&pipeline=<?= h($d['pipeline']) ?>">← <?= h(HQ_PIPELINES[$d['pipeline']]['label']) ?> leads</a></p>
      <div class="head">
        <h1><?= h($d['title']) ?> <?= badge($stages[$d['stage']] ?? $d['stage'], $d['stage'] === 'won' ? 'ok' : ($d['stage'] === 'lost' ? 'gray' : 'blue')) ?></h1>
        <?php if ($d['pipeline'] === 'chamber' && $o): ?>
          <?php if ($chamberId): ?><a class="btn" href="index.php?p=chamber&id=<?= (int) $chamberId ?>">Open chamber card</a>
          <?php else: ?><form method="post" action="index.php?p=lead_to_chamber" class="inline confirm" data-confirm="Mark this lead won and create a chamber card for <?= h($o['name']) ?>?"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $d['id'] ?>"><button class="primary">Won: create chamber card</button></form><?php endif; ?>
        <?php endif; ?>
      </div>
      <div class="cols">
        <div>
          <section class="card">
            <form method="post" action="index.php?p=lead_save" class="grid-form">
              <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $d['id'] ?>">
              <label class="full">Title <input name="title" value="<?= h($d['title']) ?>" required></label>
              <label>Stage <select name="stage"><?php foreach ($stages as $k => $l): ?><option value="<?= h($k) ?>"<?= $k === $d['stage'] ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select></label>
              <label>Monthly value <input name="value_monthly" inputmode="decimal" value="<?= h($d['value_monthly'] ?? '') ?>" placeholder="e.g. 99"></label>
              <label>Main contact <select name="contact_id"><option value="">—</option><?php foreach ($contacts as $ct): ?><option value="<?= (int) $ct['id'] ?>"<?= (int) $ct['id'] === (int) $d['contact_id'] ? ' selected' : '' ?>><?= h($ct['name']) ?></option><?php endforeach; ?></select></label>
              <label>Source <input name="source" value="<?= h($d['source'] ?? '') ?>"></label>
              <label>Next step <input name="next_step" value="<?= h($d['next_step'] ?? '') ?>"></label>
              <label>Next step due <input name="next_due" type="date" value="<?= h($d['next_due'] ?? '') ?>"></label>
              <div class="full row"><button class="primary">Save</button></div>
            </form>
          </section>
          <?php timeline(['deal_id' => (int) $d['id'], 'org_id' => $d['org_id'] ? (int) $d['org_id'] : null], "index.php?p=lead&id={$d['id']}", "deal_id = ?", [(int) $d['id']]); ?>
        </div>
        <div>
          <section class="card">
            <h2>Organization</h2>
            <?php if ($o): ?>
              <p><a href="index.php?p=org&id=<?= (int) $o['id'] ?>"><strong><?= h($o['name']) ?></strong></a><br><span class="muted small"><?= h(HQ_ORG_KINDS[$o['kind']] ?? $o['kind']) ?><?= $o['town'] ? ' · ' . h($o['town']) : '' ?><?= $o['member_count'] ? ' · ' . (int) $o['member_count'] . ' members' : '' ?></span></p>
            <?php else: ?><p class="muted">Not linked to an organization.</p><?php endif; ?>
            <h2>People</h2>
            <?php people_list($contacts); ?>
            <?php if ($o): ?><p class="small"><a href="index.php?p=contact&org=<?= (int) $o['id'] ?>">Add a person</a></p><?php endif; ?>
          </section>
          <?php task_box(['deal_id' => (int) $d['id'], 'org_id' => $d['org_id'] ? (int) $d['org_id'] : null], "index.php?p=lead&id={$d['id']}", 'deal_id = ?', [(int) $d['id']]); ?>
          <details class="card danger"><summary>Delete this lead</summary>
            <form method="post" action="index.php?p=lead_delete" class="confirm" data-confirm="Delete this lead? The organization and people stay."><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $d['id'] ?>"><button>Delete lead</button></form>
          </details>
        </div>
      </div>
      <?php
      page_end();
      return;
    }

    // ---------- contacts & organizations ----------
    case 'contacts': {
      $q = trim((string) ($_GET['q'] ?? ''));
      $args = [];
      $where = '';
      if ($q !== '') {
        $where = 'WHERE c.name LIKE ? OR c.email LIKE ? OR o.name LIKE ? OR c.title LIKE ?';
        $args = array_fill(0, 4, '%' . $q . '%');
      }
      $people = rows("SELECT c.*, o.name AS org_name FROM contacts c LEFT JOIN orgs o ON o.id = c.org_id $where ORDER BY c.name LIMIT 500", $args);
      page_start('Contacts', 'contacts');
      ?>
      <div class="head">
        <h1>Contacts</h1>
        <div class="row"><a class="btn" href="index.php?p=orgs">Organizations</a><a class="btn primary" href="index.php?p=contact">Add a person</a></div>
      </div>
      <form class="row filters" method="get"><input type="hidden" name="p" value="contacts"><input name="q" value="<?= h($q) ?>" placeholder="Search name, email, organization" aria-label="Search contacts"><button class="small">Search</button></form>
      <section class="card">
        <?php if (!$people): ?><p class="muted"><?= $q !== '' ? 'Nobody matches.' : 'No contacts yet. They are added with leads, or with Add a person.' ?></p><?php else: ?>
        <table class="tbl"><thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Phone</th></tr></thead><tbody>
          <?php foreach ($people as $c): ?>
            <tr><td><a href="index.php?p=contact&id=<?= (int) $c['id'] ?>"><?= h($c['name']) ?></a><?= $c['title'] ? '<br><span class="muted small">' . h($c['title']) . '</span>' : '' ?></td>
              <td><?= $c['org_id'] ? '<a href="index.php?p=org&id=' . (int) $c['org_id'] . '">' . h($c['org_name']) . '</a>' : '' ?></td>
              <td class="small"><?= $c['email'] ? '<a href="mailto:' . h($c['email']) . '">' . h($c['email']) . '</a>' : '' ?><?= $c['do_not_email'] ? ' ' . badge('do not email', 'err') : '' ?></td>
              <td class="small nowrap"><?= h($c['phone'] ?? '') ?></td></tr>
          <?php endforeach; ?>
        </tbody></table>
        <?php endif; ?>
      </section>
      <?php
      page_end();
      return;
    }

    case 'contact': {
      $c = !empty($_GET['id']) ? id_or_404('contacts', 'index.php?p=contacts') : null;
      $orgs = db()->query('SELECT id, name FROM orgs ORDER BY name')->fetchAll();
      $orgId = $c['org_id'] ?? (int) ($_GET['org'] ?? 0);
      page_start($c ? $c['name'] : 'Add a person', 'contacts');
      ?>
      <p class="crumbs"><a href="index.php?p=contacts">← Contacts</a></p>
      <h1><?= $c ? h($c['name']) : 'Add a person' ?></h1>
      <div class="cols">
        <section class="card">
          <form method="post" action="index.php?p=contact_save" class="grid-form">
            <?= csrf_field() ?><?php if ($c): ?><input type="hidden" name="id" value="<?= (int) $c['id'] ?>"><?php endif; ?>
            <label>Name <input name="name" required value="<?= h($c['name'] ?? '') ?>"></label>
            <label>Title or role <input name="title" value="<?= h($c['title'] ?? '') ?>" placeholder="Executive director, board chair, bank president…"></label>
            <label>Email <input name="email" type="email" value="<?= h($c['email'] ?? '') ?>"></label>
            <label>Phone <input name="phone" value="<?= h($c['phone'] ?? '') ?>"></label>
            <label>Organization <select name="org_id"><option value="">—</option><?php foreach ($orgs as $o): ?><option value="<?= (int) $o['id'] ?>"<?= (int) $o['id'] === (int) $orgId ? ' selected' : '' ?>><?= h($o['name']) ?></option><?php endforeach; ?></select></label>
            <label>…or a new organization <input name="new_org" placeholder="Type a name to create it"></label>
            <label class="check full"><input type="checkbox" name="do_not_email" value="1"<?= !empty($c['do_not_email']) ? ' checked' : '' ?>> Do not email this person</label>
            <label class="full">Notes <textarea name="notes" rows="3"><?= h($c['notes'] ?? '') ?></textarea></label>
            <div class="full"><button class="primary">Save</button></div>
          </form>
        </section>
        <?php if ($c): ?>
        <div>
          <?php timeline(['contact_id' => (int) $c['id'], 'org_id' => $c['org_id'] ? (int) $c['org_id'] : null], "index.php?p=contact&id={$c['id']}", 'contact_id = ?', [(int) $c['id']]); ?>
          <details class="card danger"><summary>Delete this person</summary>
            <form method="post" action="index.php?p=contact_delete" class="confirm" data-confirm="Delete <?= h($c['name']) ?>?"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $c['id'] ?>"><button>Delete</button></form>
          </details>
        </div>
        <?php endif; ?>
      </div>
      <?php
      page_end();
      return;
    }

    case 'orgs': {
      $kind = isset(HQ_ORG_KINDS[$_GET['kind'] ?? '']) ? $_GET['kind'] : '';
      $q = trim((string) ($_GET['q'] ?? ''));
      $where = [];
      $args = [];
      if ($kind) { $where[] = 'o.kind = ?'; $args[] = $kind; }
      if ($q !== '') { $where[] = '(o.name LIKE ? OR o.town LIKE ?)'; array_push($args, "%$q%", "%$q%"); }
      $orgs = rows('SELECT o.*, (SELECT COUNT(*) FROM contacts c WHERE c.org_id = o.id) AS people FROM orgs o ' . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY o.name LIMIT 500', $args);
      page_start('Organizations', 'contacts');
      ?>
      <p class="crumbs"><a href="index.php?p=contacts">← Contacts</a></p>
      <div class="head"><h1>Organizations</h1><a class="btn primary" href="index.php?p=org">Add an organization</a></div>
      <form class="row filters" method="get"><input type="hidden" name="p" value="orgs">
        <select name="kind" class="autosubmit" aria-label="Kind"><option value="">All kinds</option><?php foreach (HQ_ORG_KINDS as $k => $l): ?><option value="<?= h($k) ?>"<?= $k === $kind ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select>
        <input name="q" value="<?= h($q) ?>" placeholder="Search name or town" aria-label="Search organizations"><button class="small">Search</button></form>
      <section class="card">
        <?php if (!$orgs): ?><p class="muted">None yet.</p><?php else: ?>
        <table class="tbl"><thead><tr><th>Name</th><th>Kind</th><th>Town</th><th>Members</th><th>Software</th><th>People</th></tr></thead><tbody>
          <?php foreach ($orgs as $o): ?>
            <tr><td><a href="index.php?p=org&id=<?= (int) $o['id'] ?>"><?= h($o['name']) ?></a></td><td class="small"><?= h(HQ_ORG_KINDS[$o['kind']] ?? $o['kind']) ?></td>
              <td class="small"><?= h(trim(($o['town'] ?? '') . ', ' . ($o['state'] ?? ''), ', ')) ?></td><td><?= $o['member_count'] !== null ? (int) $o['member_count'] : '' ?></td>
              <td class="small"><?= h($o['current_software'] ?? '') ?></td><td><?= (int) $o['people'] ?></td></tr>
          <?php endforeach; ?>
        </tbody></table>
        <?php endif; ?>
      </section>
      <?php
      page_end();
      return;
    }

    case 'org': {
      $o = !empty($_GET['id']) ? id_or_404('orgs', 'index.php?p=orgs') : null;
      page_start($o ? $o['name'] : 'Add an organization', 'contacts');
      $people = $o ? rows('SELECT * FROM contacts WHERE org_id = ? ORDER BY name', [$o['id']]) : [];
      $deals = $o ? rows('SELECT * FROM deals WHERE org_id = ? ORDER BY updated_at DESC', [$o['id']]) : [];
      $chs = $o ? rows('SELECT id, name, status FROM chambers WHERE org_id = ? OR sponsor_org_id = ?', [$o['id'], $o['id']]) : [];
      ?>
      <p class="crumbs"><a href="index.php?p=orgs">← Organizations</a></p>
      <h1><?= $o ? h($o['name']) : 'Add an organization' ?></h1>
      <div class="cols">
        <div>
          <section class="card">
            <form method="post" action="index.php?p=org_save" class="grid-form">
              <?= csrf_field() ?><?php if ($o): ?><input type="hidden" name="id" value="<?= (int) $o['id'] ?>"><?php endif; ?><?= back_field('index.php?p=orgs') ?>
              <label>Name <input name="name" required value="<?= h($o['name'] ?? '') ?>"></label>
              <label>Kind <select name="kind"><?php foreach (HQ_ORG_KINDS as $k => $l): ?><option value="<?= h($k) ?>"<?= $k === ($o['kind'] ?? 'prospect') ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select></label>
              <label>Town <input name="town" value="<?= h($o['town'] ?? '') ?>"></label>
              <label>State <input name="state" value="<?= h($o['state'] ?? '') ?>" maxlength="40"></label>
              <label>Website <input name="website" value="<?= h($o['website'] ?? '') ?>"></label>
              <label>Members <input name="member_count" inputmode="numeric" value="<?= h($o['member_count'] ?? '') ?>"></label>
              <label class="full">Current software <input name="current_software" value="<?= h($o['current_software'] ?? '') ?>" placeholder="GrowthZone, ChamberMaster, MemberClicks, none…"></label>
              <label class="full">Notes <textarea name="notes" rows="3"><?= h($o['notes'] ?? '') ?></textarea></label>
              <div class="full"><button class="primary">Save</button></div>
            </form>
          </section>
          <?php if ($o) timeline(['org_id' => (int) $o['id']], "index.php?p=org&id={$o['id']}", 'org_id = ?', [(int) $o['id']]); ?>
        </div>
        <?php if ($o): ?>
        <div>
          <?php if ($chs): ?><section class="card"><h2>Chamber cards</h2><ul class="list"><?php foreach ($chs as $c): ?><li><a href="index.php?p=chamber&id=<?= (int) $c['id'] ?>"><?= h($c['name']) ?></a><?= badge(...HQ_CHAMBER_STATUS[$c['status']]) ?></li><?php endforeach; ?></ul></section><?php endif; ?>
          <section class="card"><h2>People</h2><?php people_list($people); ?><p class="small"><a href="index.php?p=contact&org=<?= (int) $o['id'] ?>">Add a person</a></p></section>
          <section class="card"><h2>Leads</h2>
            <?php if (!$deals): ?><p class="muted small">No leads.</p><?php endif; ?>
            <ul class="list"><?php foreach ($deals as $d): ?><li><a href="index.php?p=lead&id=<?= (int) $d['id'] ?>"><?= h($d['title']) ?></a><span class="small muted"><?= h(HQ_PIPELINES[$d['pipeline']]['label']) ?> · <?= h(HQ_PIPELINES[$d['pipeline']]['stages'][$d['stage']] ?? $d['stage']) ?></span></li><?php endforeach; ?></ul>
          </section>
          <?php task_box(['org_id' => (int) $o['id']], "index.php?p=org&id={$o['id']}", 'org_id = ?', [(int) $o['id']]); ?>
          <details class="card danger"><summary>Delete this organization</summary>
            <form method="post" action="index.php?p=org_delete" class="confirm" data-confirm="Delete <?= h($o['name']) ?>? Its people and leads are kept."><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $o['id'] ?>"><button>Delete</button></form>
          </details>
        </div>
        <?php endif; ?>
      </div>
      <?php
      page_end();
      return;
    }

    // ---------- tasks ----------
    case 'tasks': {
      $done = !empty($_GET['done']);
      $list = rows('SELECT t.*, o.name AS org_name, d.title AS deal_title, c.name AS chamber_name FROM tasks t LEFT JOIN orgs o ON o.id = t.org_id LEFT JOIN deals d ON d.id = t.deal_id LEFT JOIN chambers c ON c.id = t.chamber_id
        WHERE t.done_at IS ' . ($done ? 'NOT NULL ORDER BY t.done_at DESC LIMIT 100' : 'NULL ORDER BY t.due_date IS NULL, t.due_date, t.id'));
      page_start('Tasks', 'tasks');
      ?>
      <div class="head"><h1>Tasks</h1><a class="small" href="index.php?p=tasks<?= $done ? '' : '&done=1' ?>"><?= $done ? 'Show open tasks' : 'Show finished tasks' ?></a></div>
      <section class="card">
        <form method="post" action="index.php?p=task_save" class="row"><?= csrf_field() ?><?= back_field('index.php?p=tasks') ?>
          <input name="title" placeholder="What needs doing?" required aria-label="Task" style="flex:1 1 260px"><input name="due_date" type="date" aria-label="Due date" style="width:auto"><button class="primary">Add task</button></form>
      </section>
      <section class="card">
        <?php if (!$list): ?><p class="muted"><?= $done ? 'Nothing finished yet.' : 'Nothing to do. Nice.' ?></p><?php endif; ?>
        <ul class="list">
          <?php foreach ($list as $t): ?>
            <li>
              <span><?= h($t['title']) ?>
                <?php foreach ([['deal_title', 'lead', 'deal_id'], ['org_name', 'org', 'org_id'], ['chamber_name', 'chamber', 'chamber_id']] as [$n, $pg, $k]): if ($t[$n]): ?><span class="muted small"> · <a href="index.php?p=<?= $pg ?>&id=<?= (int) $t[$k] ?>"><?= h($t[$n]) ?></a></span><?php endif; endforeach; ?>
              </span>
              <span class="row"><?= $done ? '<span class="muted small">done ' . ago($t['done_at']) . '</span>' : due_label($t['due_date']) ?>
                <form method="post" action="index.php?p=task_done" class="inline"><?= csrf_field() ?><?= back_field('index.php?p=tasks' . ($done ? '&done=1' : '')) ?><input type="hidden" name="id" value="<?= (int) $t['id'] ?>"><?php if ($done): ?><input type="hidden" name="undo" value="1"><button class="small">Reopen</button><?php else: ?><button class="small">Done</button><?php endif; ?></form>
                <form method="post" action="index.php?p=task_delete" class="inline"><?= csrf_field() ?><?= back_field('index.php?p=tasks' . ($done ? '&done=1' : '')) ?><input type="hidden" name="id" value="<?= (int) $t['id'] ?>"><button class="small link" aria-label="Delete task">✕</button></form>
              </span>
            </li>
          <?php endforeach; ?>
        </ul>
      </section>
      <?php
      page_end();
      return;
    }

    // ---------- docs ----------
    case 'docs': {
      $q = trim((string) ($_GET['q'] ?? ''));
      $folder = (string) ($_GET['folder'] ?? '');
      $docs = $q !== '' ? search_docs($q, 50) : ($folder !== '' ? rows('SELECT * FROM docs WHERE folder = ? ORDER BY title', [$folder]) : rows('SELECT * FROM docs ORDER BY folder, title'));
      $folders = rows('SELECT folder, COUNT(*) AS n FROM docs GROUP BY folder ORDER BY folder');
      page_start('Docs', 'docs');
      ?>
      <div class="head"><h1>Docs library</h1><div class="row"><a class="btn" href="index.php?p=ask">Ask HQ</a><a class="btn primary" href="index.php?p=doc_edit">New doc</a></div></div>
      <form class="row filters" method="get"><input type="hidden" name="p" value="docs"><input name="q" value="<?= h($q) ?>" placeholder="Search your docs" aria-label="Search docs"><button class="small">Search</button></form>
      <div class="cols wide-left">
        <section class="card">
          <?php if (!$docs): ?><p class="muted"><?= $q !== '' ? 'Nothing matches. Try other words, or ask HQ.' : 'No docs yet. Start with the setup steps you look up most: Cloudflare, inbound email, Amazon SES.' ?></p><?php endif; ?>
          <?php $cur = null; foreach ($docs as $d):
            if ($q === '' && $d['folder'] !== $cur): if ($cur !== null) echo '</ul>'; $cur = $d['folder']; ?><h2><?= h($cur) ?></h2><ul class="list"><?php endif;
            if ($q !== '' && $cur === null) { $cur = ''; echo '<ul class="list">'; } ?>
            <li><a href="index.php?p=doc&id=<?= (int) $d['id'] ?>"><?= h($d['title']) ?></a><span class="muted small"><?= $q !== '' ? h($d['folder']) : '' ?></span></li>
          <?php endforeach; if ($cur !== null) echo '</ul>'; ?>
        </section>
        <section class="card">
          <h2>Folders</h2>
          <ul class="list"><li><a href="index.php?p=docs">All docs</a></li><?php foreach ($folders as $f): ?><li><a href="index.php?p=docs&folder=<?= urlencode($f['folder']) ?>"><?= h($f['folder']) ?></a><span class="muted small"><?= (int) $f['n'] ?></span></li><?php endforeach; ?></ul>
        </section>
      </div>
      <?php
      page_end();
      return;
    }

    case 'doc': {
      $d = id_or_404('docs', 'index.php?p=docs');
      page_start($d['title'], 'docs');
      $stale = !$d['last_checked'] || strtotime($d['last_checked']) < time() - 180 * 86400;
      ?>
      <p class="crumbs"><a href="index.php?p=docs&folder=<?= urlencode($d['folder']) ?>">← <?= h($d['folder']) ?></a></p>
      <div class="head"><h1><?= h($d['title']) ?></h1><a class="btn" href="index.php?p=doc_edit&id=<?= (int) $d['id'] ?>">Edit</a></div>
      <p class="small muted">Updated <?= ago($d['updated_at']) ?> · <?= $d['last_checked'] ? 'steps last checked ' . h(date('M j, Y', strtotime($d['last_checked']))) : 'steps never checked' ?><?= $stale ? ' ' . badge('worth re-checking', 'warn') : '' ?><?= $d['tags'] ? ' · ' . h($d['tags']) : '' ?></p>
      <article class="card doc"><?= md($d['body']) ?></article>
      <?php
      page_end();
      return;
    }

    case 'doc_edit': {
      $d = !empty($_GET['id']) ? id_or_404('docs', 'index.php?p=docs') : null;
      $folders = array_values(array_unique(array_merge(HQ_DOC_FOLDERS, array_column(rows('SELECT DISTINCT folder FROM docs'), 'folder'))));
      page_start($d ? 'Edit ' . $d['title'] : 'New doc', 'docs');
      ?>
      <p class="crumbs"><a href="<?= $d ? 'index.php?p=doc&id=' . (int) $d['id'] : 'index.php?p=docs' ?>">← Back</a></p>
      <h1><?= $d ? 'Edit doc' : 'New doc' ?></h1>
      <section class="card">
        <form method="post" action="index.php?p=doc_save" class="grid-form">
          <?= csrf_field() ?><?php if ($d): ?><input type="hidden" name="id" value="<?= (int) $d['id'] ?>"><?php endif; ?>
          <label class="full">Title <input name="title" required value="<?= h($d['title'] ?? '') ?>" placeholder="How to set up inbound email for a new chamber"></label>
          <label>Folder <select name="folder"><?php foreach ($folders as $f): ?><option<?= $f === ($d['folder'] ?? 'General') ? ' selected' : '' ?>><?= h($f) ?></option><?php endforeach; ?></select></label>
          <label>…or a new folder <input name="new_folder" placeholder="Type a name to create it"></label>
          <label>Tags <input name="tags" value="<?= h($d['tags'] ?? '') ?>" placeholder="dns, email, ses"></label>
          <label class="check"><input type="checkbox" name="checked_now" value="1"> I checked these steps today</label>
          <input type="hidden" name="last_checked" value="<?= h($d['last_checked'] ?? '') ?>">
          <label class="full">Text <span class="hint">Markdown: # Heading, - list, 1. steps, **bold**, `code`, [link](https://…), ``` for code blocks. Never paste passwords or keys here.</span>
            <textarea name="body" rows="22" class="mono" required><?= h($d['body'] ?? '') ?></textarea></label>
          <div class="full row"><button class="primary">Save doc</button></div>
        </form>
      </section>
      <?php if ($d): ?>
        <details class="card danger"><summary>Delete this doc</summary>
          <form method="post" action="index.php?p=doc_delete" class="confirm" data-confirm="Delete this doc for good?"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $d['id'] ?>"><button>Delete doc</button></form>
        </details>
      <?php endif; ?>
      <?php
      page_end();
      return;
    }

    // ---------- Ask HQ ----------
    case 'ask': {
      $hasKey = (bool) setting('openai_api_key');
      $cur = !empty($_GET['a']) ? row('ask_log', (int) $_GET['a']) : null;
      $recent = rows('SELECT id, question, created_at FROM ask_log ORDER BY id DESC LIMIT 15');
      $used = $cur && $cur['doc_ids'] ? rows('SELECT id, title FROM docs WHERE id IN (' . implode(',', array_map('intval', explode(',', $cur['doc_ids']))) . ')') : [];
      page_start('Ask HQ', 'ask');
      ?>
      <h1>Ask HQ</h1>
      <p class="muted">Ask how to do something. Answers come only from your <a href="index.php?p=docs">docs library</a>, with the doc numbers they used.</p>
      <?php if (!$hasKey): ?><div class="flash warn">Add your OpenAI API key in <a href="index.php?p=settings">Settings</a> to turn this on.</div><?php endif; ?>
      <section class="card">
        <form method="post" action="index.php?p=ask" class="stack" id="ask-form"><?= csrf_field() ?>
          <label>Your question <textarea name="q" rows="2" required placeholder="How do I set up inbound email for a new chamber?"></textarea></label>
          <div><button class="primary"<?= $hasKey ? '' : ' disabled' ?>>Ask</button></div>
        </form>
      </section>
      <?php if ($cur): ?>
        <section class="card">
          <p class="muted small">You asked: <?= h($cur['question']) ?></p>
          <div class="doc<?= $cur['ok'] ? '' : ' flash err' ?>"><?= $cur['ok'] ? md(preg_replace_callback('/\[#(\d+)\]/', fn($m) => '[[#' . $m[1] . ']](index.php?p=doc&id=' . $m[1] . ')', (string) $cur['answer'])) : h($cur['answer']) ?></div>
          <?php if ($used): ?><p class="small">Docs used: <?php foreach ($used as $i => $u): ?><?= $i ? ', ' : '' ?><a href="index.php?p=doc&id=<?= (int) $u['id'] ?>">#<?= (int) $u['id'] ?> <?= h($u['title']) ?></a><?php endforeach; ?></p><?php endif; ?>
          <?php if ($cur['ok']): ?><form method="post" action="index.php?p=ask_save_doc" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $cur['id'] ?>"><button class="small">Save this answer as a doc</button></form><?php endif; ?>
        </section>
      <?php endif; ?>
      <?php if ($recent): ?>
        <section class="card"><h2>Recent questions</h2><ul class="list"><?php foreach ($recent as $r): ?><li><a href="index.php?p=ask&a=<?= (int) $r['id'] ?>"><?= h(mb_strimwidth($r['question'], 0, 110, '…')) ?></a><span class="muted small"><?= ago($r['created_at']) ?></span></li><?php endforeach; ?></ul></section>
      <?php endif; ?>
      <?php
      page_end();
      return;
    }
  }
}

// =====================================================================
// shared pieces
// =====================================================================

function chamber_card(array $c): void {
  $s = chamber_snapshot($c);
  $n = $s['counts'] ?? [];
  $logo = $s['chamber']['logo_url'] ?? null;
  $flags = chamber_flags($c);
  ?>
  <article class="card app">
    <header>
      <?php if ($logo && str_starts_with($logo, 'https://')): ?><img class="applogo" src="<?= h($logo) ?>" alt=""><?php else: ?><span class="applogo ph"></span><?php endif; ?>
      <div>
        <h2><a href="index.php?p=chamber&id=<?= (int) $c['id'] ?>"><?= h($c['name']) ?></a></h2>
        <span class="muted small"><?= h(HQ_PLANS[$c['plan']][0] ?? $c['plan']) ?> · <?= money($c['monthly_price']) ?>/mo</span>
      </div>
      <?= badge(...HQ_CHAMBER_STATUS[$c['status']]) ?>
    </header>
    <?php if ($c['sponsor_name']): ?><p class="small">Presented by <a href="index.php?p=org&id=<?= (int) $c['sponsor_org_id'] ?>"><?= h($c['sponsor_name']) ?></a></p><?php endif; ?>
    <?php if ($n): ?>
      <dl class="stats">
        <div><dt>Members</dt><dd><?= number_format((int) ($n['members'] ?? $c['member_count'] ?? 0)) ?></dd></div>
        <div><dt>Logins 30d</dt><dd><?= number_format((int) ($n['logins_30d'] ?? 0)) ?></dd></div>
        <div><dt>Tickets</dt><dd><?= (int) ($n['open_tickets'] ?? 0) ?></dd></div>
        <div><dt>AI asks</dt><dd><?= number_format((int) ($n['ai_requests_month'] ?? 0)) ?></dd></div>
      </dl>
    <?php endif; ?>
    <?php if ($flags): ?><p class="flags"><?php foreach ($flags as [$t, $k]) echo badge($t, $k) . ' '; ?></p><?php endif; ?>
    <p class="small muted"><?= $c['connector_url'] ? 'Checked ' . ago($c['snapshot_at']) : '' ?></p>
    <footer>
      <?php if ($c['admin_url']): ?><a class="btn small" href="<?= h($c['admin_url']) ?>" target="_blank" rel="noopener">Open admin ↗</a><?php endif; ?>
      <?php if ($c['site_url']): ?><a class="btn small" href="<?= h($c['site_url']) ?>" target="_blank" rel="noopener">Site ↗</a><?php endif; ?>
      <?php if ($c['app_id'] && $c['pwa_url']): ?><a class="btn small" href="<?= h($c['pwa_url']) ?>" target="_blank" rel="noopener">PWA ↗</a><?php endif; ?>
      <?php if ($b = base44_editor_url($c['base44_app_id'])): ?><a class="btn small" href="<?= h($b) ?>" target="_blank" rel="noopener">Base44 ↗</a><?php endif; ?>
    </footer>
  </article>
  <?php
}

function chamber_detail(array $c): void {
  $s = chamber_snapshot($c);
  $n = $s['counts'] ?? [];
  $sponsor = $c['sponsor_org_id'] ? row('orgs', (int) $c['sponsor_org_id']) : null;
  $pwa = $c['app_id'] ? find_app((int) $c['app_id']) : null;
  $people = $c['org_id'] ? rows('SELECT * FROM contacts WHERE org_id = ? ORDER BY name', [$c['org_id']]) : [];
  ?>
  <p class="crumbs"><a href="index.php?p=chambers">← Chambers</a></p>
  <div class="head">
    <h1><?= h($c['name']) ?> <?= badge(...HQ_CHAMBER_STATUS[$c['status']]) ?></h1>
    <div class="row">
      <?php if ($c['connector_url']): ?><form method="post" action="index.php?p=chamber_refresh" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $c['id'] ?>"><button class="btn">Refresh</button></form><?php endif; ?>
      <a class="btn" href="index.php?p=chamber&id=<?= (int) $c['id'] ?>&edit=1">Edit</a>
    </div>
  </div>
  <div class="row links">
    <?php if ($c['admin_url']): ?><a class="btn primary" href="<?= h($c['admin_url']) ?>" target="_blank" rel="noopener">Open admin ↗</a><?php endif; ?>
    <?php if ($c['site_url']): ?><a class="btn" href="<?= h($c['site_url']) ?>" target="_blank" rel="noopener">Public site ↗</a><?php endif; ?>
    <?php if ($pwa): ?>
      <a class="btn" href="<?= h($pwa['url']) ?>" target="_blank" rel="noopener">PWA ↗</a>
      <form method="post" action="index.php?p=app_admin" target="_blank" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $pwa['id'] ?>"><button class="btn">PWA admin ↗</button></form>
    <?php endif; ?>
    <?php if ($b = base44_editor_url($c['base44_app_id'])): ?><a class="btn" href="<?= h($b) ?>" target="_blank" rel="noopener">Base44 editor ↗</a><?php endif; ?>
  </div>
  <?php if ($flags = chamber_flags($c)): ?><p class="flags"><?php foreach ($flags as [$t, $k]) echo badge($t, $k) . ' '; ?></p><?php endif; ?>
  <div class="cols">
    <div>
      <section class="card">
        <h2>Status from the app</h2>
        <?php if (!$c['connector_url']): ?>
          <p class="muted">The HQ connector isn't set up for this chamber yet. Once it is, member counts, tickets, approvals and health checks show here, refreshed every <?= HQ_REFRESH_HOURS ?> hours and whenever you open this page.</p>
        <?php elseif (!$n): ?>
          <p class="muted"><?= $c['snapshot_error'] ? h($c['snapshot_error']) : 'No status yet.' ?></p>
        <?php else: ?>
          <dl class="stats wide">
            <?php foreach (['members' => 'Members', 'users' => 'App users', 'logins_30d' => 'Logins (30 days)', 'open_tickets' => 'Open tickets', 'pending_approvals' => 'Waiting for approval', 'ai_requests_month' => 'AI requests this month', 'email_bounces_30d' => 'Email bounces (30 days)'] as $k => $l):
              $v = $n[$k] ?? ($s['health'][$k] ?? null); if ($v === null) continue; ?>
              <div><dt><?= h($l) ?></dt><dd><?= number_format((int) $v) ?></dd></div>
            <?php endforeach; ?>
          </dl>
          <p class="small muted">Checked <?= ago($c['snapshot_at']) ?><?= !empty($s['version']) ? ' · connector ' . h($s['version']) : '' ?></p>
        <?php endif; ?>
      </section>
      <?php timeline(['chamber_id' => (int) $c['id'], 'org_id' => $c['org_id'] ? (int) $c['org_id'] : null], "index.php?p=chamber&id={$c['id']}", 'chamber_id = ?', [(int) $c['id']]); ?>
    </div>
    <div>
      <section class="card">
        <h2>Plan</h2>
        <p><?= h(HQ_PLANS[$c['plan']][0] ?? $c['plan']) ?> · <strong><?= money($c['monthly_price']) ?>/mo</strong></p>
        <p class="small"><?= $sponsor ? 'Presented by <a href="index.php?p=org&id=' . (int) $sponsor['id'] . '">' . h($sponsor['name']) . '</a>' : '<span class="muted">No sponsor</span>' ?></p>
        <?php if ($c['status'] === 'grace' && $c['grace_ends']): ?><p class="small">Grace period ends <?= h(date('M j, Y', strtotime($c['grace_ends']))) ?>. Then $49/mo or Free Lite.</p><?php endif; ?>
        <?php if ($c['town'] || $c['member_count']): ?><p class="small muted"><?= h(trim(($c['town'] ?? '') . ', ' . ($c['state'] ?? ''), ', ')) ?><?= $c['member_count'] ? ' · ' . (int) $c['member_count'] . ' members' : '' ?></p><?php endif; ?>
        <?php if ($c['notes']): ?><div class="small doc"><?= md($c['notes']) ?></div><?php endif; ?>
      </section>
      <section class="card">
        <h2>People</h2>
        <?php people_list($people); ?>
        <?php if ($c['org_id']): ?><p class="small"><a href="index.php?p=contact&org=<?= (int) $c['org_id'] ?>">Add a person</a> · <a href="index.php?p=org&id=<?= (int) $c['org_id'] ?>">Organization record</a></p><?php endif; ?>
      </section>
      <?php task_box(['chamber_id' => (int) $c['id'], 'org_id' => $c['org_id'] ? (int) $c['org_id'] : null], "index.php?p=chamber&id={$c['id']}", 'chamber_id = ?', [(int) $c['id']]); ?>
    </div>
  </div>
  <?php
}

function chamber_form(?array $c): void {
  $sponsors = rows("SELECT id, name FROM orgs WHERE kind = 'sponsor' ORDER BY name");
  $apps = all_apps(false);
  ?>
  <p class="crumbs"><a href="<?= $c ? 'index.php?p=chamber&id=' . (int) $c['id'] : 'index.php?p=chambers' ?>">← Back</a></p>
  <h1><?= $c ? 'Edit ' . h($c['name']) : 'Add a chamber' ?></h1>
  <form method="post" action="index.php?p=chamber_save" class="card grid-form">
    <?= csrf_field() ?><?php if ($c): ?><input type="hidden" name="id" value="<?= (int) $c['id'] ?>"><?php endif; ?>
    <label>Chamber name <input name="name" required value="<?= h($c['name'] ?? '') ?>" placeholder="Muleshoe Chamber of Commerce & Agriculture"></label>
    <label>Town <input name="town" value="<?= h($c['town'] ?? '') ?>"></label>
    <label>State <input name="state" value="<?= h($c['state'] ?? '') ?>" maxlength="40"></label>
    <label>Members <input name="member_count" inputmode="numeric" value="<?= h($c['member_count'] ?? '') ?>"></label>
    <label>Status <select name="status"><?php foreach (HQ_CHAMBER_STATUS as $k => [$l]): ?><option value="<?= h($k) ?>"<?= $k === ($c['status'] ?? 'onboarding') ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select></label>
    <label>Grace period ends <input name="grace_ends" type="date" value="<?= h($c['grace_ends'] ?? '') ?>"><span class="hint">Only when a sponsor left. Defaults to 60 days from today.</span></label>
    <label>Plan <select name="plan"><?php foreach (HQ_PLANS as $k => [$l, $price]): ?><option value="<?= h($k) ?>"<?= $k === ($c['plan'] ?? 'founding') ? ' selected' : '' ?>><?= h($l) ?> (<?= money($price) ?>)</option><?php endforeach; ?></select></label>
    <label>Monthly price <input name="monthly_price" inputmode="decimal" value="<?= h($c['monthly_price'] ?? '') ?>" placeholder="Leave empty for the plan's price"></label>
    <label class="full">Sponsor <select name="sponsor_org_id"><option value="">No sponsor</option><?php foreach ($sponsors as $s): ?><option value="<?= (int) $s['id'] ?>"<?= (int) $s['id'] === (int) ($c['sponsor_org_id'] ?? 0) ? ' selected' : '' ?>><?= h($s['name']) ?></option><?php endforeach; ?></select>
      <span class="hint">Sponsors are organizations of the kind "Sponsor business". <a href="index.php?p=org">Add one</a>.</span></label>
    <h2 class="full">Links</h2>
    <label>Public website <input name="site_url" value="<?= h($c['site_url'] ?? '') ?>" placeholder="https://muleshoetxchamber.com"></label>
    <label>Admin sign-in page <input name="admin_url" value="<?= h($c['admin_url'] ?? '') ?>" placeholder="https://muleshoetxchamber.com/login"></label>
    <label>Base44 app ID <input name="base44_app_id" value="<?= h($c['base44_app_id'] ?? '') ?>" class="mono" placeholder="6a8c85d1bf3d91ec40ae059d"></label>
    <label>PWA <select name="app_id"><option value="">None</option><?php foreach ($apps as $a): ?><option value="<?= (int) $a['id'] ?>"<?= (int) $a['id'] === (int) ($c['app_id'] ?? 0) ? ' selected' : '' ?>><?= h($a['name']) ?></option><?php endforeach; ?></select></label>
    <h2 class="full">HQ connector</h2>
    <p class="full muted small">The connector is a small function in the chamber's Base44 app that sends HQ a status snapshot. HQ checks it every <?= HQ_REFRESH_HOURS ?> hours and when you open the chamber. See docs/HQ.md for setup.</p>
    <label>Connector address <input name="connector_url" value="<?= h($c['connector_url'] ?? '') ?>" placeholder="https://…/functions/hqConnector"></label>
    <label>Connector key <input name="connector_key" type="password" autocomplete="off" placeholder="<?= !empty($c['connector_key']) ? 'Saved. Paste a new one to replace it.' : 'The HQ_CONNECTOR_KEY secret in the app' ?>"></label>
    <?php if (!empty($c['connector_key'])): ?><label class="check full"><input type="checkbox" name="clear_key" value="1"> Remove the saved key</label><?php endif; ?>
    <label class="full">Notes <textarea name="notes" rows="3"><?= h($c['notes'] ?? '') ?></textarea></label>
    <div class="full"><button class="primary">Save</button></div>
  </form>
  <?php if ($c): ?>
    <details class="card danger"><summary>Remove from HQ</summary>
      <form method="post" action="index.php?p=chamber_delete" class="stack"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
        <p class="small">This removes the chamber card only. The Base44 app, the PWA and the organization record are not touched.</p>
        <label>Type REMOVE to confirm <input name="confirm" autocomplete="off"></label><button>Remove</button></form>
    </details>
  <?php endif;
}

function people_list(array $people): void {
  if (!$people) {
    echo '<p class="muted small">Nobody yet.</p>';
    return;
  }
  echo '<ul class="list">';
  foreach ($people as $c) {
    if (!$c) continue;
    echo '<li><span><a href="index.php?p=contact&id=' . (int) $c['id'] . '">' . h($c['name']) . '</a>' . ($c['title'] ? ' <span class="muted small">· ' . h($c['title']) . '</span>' : '') . '</span>';
    echo '<span class="small">' . ($c['email'] ? '<a href="mailto:' . h($c['email']) . '">' . h($c['email']) . '</a>' : '') . ($c['phone'] ? ' ' . h($c['phone']) : '') . '</span></li>';
  }
  echo '</ul>';
}

/** Notes and history for a record, with a form to add a note. */
function timeline(array $links, string $back, string $where, array $args): void {
  $items = rows("SELECT * FROM activities WHERE $where ORDER BY id DESC LIMIT 50", $args);
  ?>
  <section class="card">
    <h2>Notes and history</h2>
    <form method="post" action="index.php?p=note_add" class="stack"><?= csrf_field() ?><?= back_field($back) ?>
      <?php foreach ($links as $k => $v) if ($v) echo '<input type="hidden" name="' . h($k) . '" value="' . (int) $v . '">'; ?>
      <div class="row"><select name="kind" aria-label="Kind" style="width:auto"><?php foreach (HQ_ACTIVITY_KINDS as $k => $l) if ($k !== 'system') echo '<option value="' . h($k) . '">' . h($l) . '</option>'; ?></select></div>
      <textarea name="body" rows="2" placeholder="What happened? Called, emailed, met, decided…" aria-label="Note" required></textarea>
      <div><button class="small primary">Add</button></div>
    </form>
    <ul class="list timeline">
      <?php foreach ($items as $a): ?>
        <li><span><?= $a['kind'] !== 'note' ? badge(HQ_ACTIVITY_KINDS[$a['kind']] ?? $a['kind'], $a['kind'] === 'system' ? 'gray' : 'blue') . ' ' : '' ?><span class="pre"><?= h($a['body']) ?></span></span><span class="muted small nowrap"><?= ago($a['created_at']) ?></span></li>
      <?php endforeach; ?>
    </ul>
  </section>
  <?php
}

function task_box(array $links, string $back, string $where, array $args): void {
  $open = rows("SELECT * FROM tasks WHERE done_at IS NULL AND $where ORDER BY due_date IS NULL, due_date", $args);
  ?>
  <section class="card">
    <h2>Tasks</h2>
    <ul class="list">
      <?php foreach ($open as $t): ?>
        <li><span><?= h($t['title']) ?> <?= due_label($t['due_date']) ?></span>
          <form method="post" action="index.php?p=task_done" class="inline"><?= csrf_field() ?><?= back_field($back) ?><input type="hidden" name="id" value="<?= (int) $t['id'] ?>"><button class="small">Done</button></form></li>
      <?php endforeach; ?>
    </ul>
    <form method="post" action="index.php?p=task_save" class="stack"><?= csrf_field() ?><?= back_field($back) ?>
      <?php foreach ($links as $k => $v) if ($v) echo '<input type="hidden" name="' . h($k) . '" value="' . (int) $v . '">'; ?>
      <input name="title" placeholder="Add a follow-up" aria-label="New task" required>
      <div class="row"><input name="due_date" type="date" aria-label="Due date" style="width:auto"><button class="small">Add</button></div>
    </form>
  </section>
  <?php
}

/** Extra cards on the Settings screen. */
function hq_settings_cards(): void {
  $hasKey = (bool) setting('openai_api_key');
  $secret = lead_hook_secret();
  $base = (is_https() ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'dashboard.chamberloop.com') . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/');
  ?>
  <section class="card">
    <h2>Ask HQ (OpenAI)</h2>
    <p class="muted">Ask HQ answers from your docs library using OpenAI. The key is stored encrypted on this server.</p>
    <form method="post" action="index.php?p=hq_settings" class="stack">
      <?= csrf_field() ?>
      <label>OpenAI API key <input name="openai_api_key" type="password" autocomplete="off" placeholder="<?= $hasKey ? 'Saved. Paste a new one to replace it.' : 'sk-…' ?>"></label>
      <label>Model <input name="openai_model" value="<?= h(setting('openai_model') ?: 'gpt-4o-mini') ?>"></label>
      <?php if ($hasKey): ?><label class="check"><input type="checkbox" name="clear_openai" value="1"> Remove the saved key</label><?php endif; ?>
      <button class="primary">Save</button>
    </form>
  </section>
  <section class="card">
    <h2>Lead inbox</h2>
    <p class="muted">Anything that can send a web request (the chamberloop.com demo form, NotiQ, Zapier) can add a lead by POSTing JSON to this address. Keep it private: anyone with it can add leads.</p>
    <p><code class="mono wrap"><?= h($base . '/lead_hook.php?key=' . $secret) ?></code></p>
    <p class="small muted">Fields: <span class="mono">name, email, organization, phone, role, member_count, interests, notes, source, pipeline</span> ("chamber" or "sponsor").</p>
    <form method="post" action="index.php?p=hq_settings" class="confirm" data-confirm="Make a new address? The old one stops working."><?= csrf_field() ?><input type="hidden" name="new_lead_secret" value="1"><button class="small">Make a new address</button></form>
  </section>
  <section class="card">
    <h2>Chamber checks</h2>
    <p class="muted">HQ asks each chamber's connector for its status every <?= HQ_REFRESH_HOURS ?> hours, plus whenever you open a chamber. Set a cron job in hPanel → Advanced → Cron Jobs, every 4 hours:</p>
    <p><code class="mono wrap">php <?= h(DASH_ROOT) ?>/cron.php</code></p>
  </section>
  <?php
}
