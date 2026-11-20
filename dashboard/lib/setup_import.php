<?php
/**
 * One-time import from the Base44 "ChamberLoop Setup Manager" app into HQ.
 * Input: the JSON file Claude exported (setup-manager-for-hq.json):
 *   {"source":"chamberloop-setup-manager","chambers":[…],"releases":[…],"handoffs":[…],
 *    "verification_tasks":[…],"packages":[…],"verifications":[…]}
 * Safe to run twice: chambers are matched by Base44 app id, docs by title, and tasks and the
 * import note are only added the first time a chamber is imported.
 */

declare(strict_types=1);

const SM_FOLDER = 'Setup Manager';

function sm_is_sample(array $r): bool {
  return !empty($r['is_sample']) || preg_match('/^(QA )?sample\b|QA SAMPLE/i', (string) ($r['name'] ?? $r['label'] ?? $r['title'] ?? $r['version'] ?? ''));
}

function sm_doc_upsert(string $title, string $body, string $tags): void {
  $st = db()->prepare('SELECT id FROM docs WHERE folder = ? AND title = ? LIMIT 1');
  $st->execute([SM_FOLDER, $title]);
  if ($id = $st->fetchColumn()) {
    db()->prepare('UPDATE docs SET body = ?, tags = ?, updated_at = ? WHERE id = ?')->execute([$body, $tags, now(), $id]);
  } else {
    db()->prepare('INSERT INTO docs (folder, title, body, tags, last_checked, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      ->execute([SM_FOLDER, mb_substr($title, 0, 190), $body, $tags, gmdate('Y-m-d'), now(), now()]);
  }
}

function sm_date(?string $d): string {
  return $d ? gmdate('M j, Y', strtotime($d)) : '';
}

/** @return string[] what happened, one line each */
function setup_manager_import(array $data): array {
  if (($data['source'] ?? '') !== 'chamberloop-setup-manager') throw new InvalidArgumentException('This is not a Setup Manager export file.');
  $log = [];
  $byChamber = fn(string $key, string $cid) => array_values(array_filter($data[$key] ?? [], fn($r) => ($r['chamber_id'] ?? '') === $cid && !sm_is_sample($r)));

  foreach ($data['chambers'] ?? [] as $c) {
    if (sm_is_sample($c) || empty($c['name'])) { $log[] = 'Skipped sample chamber ' . ($c['name'] ?? '?'); continue; }
    $appId = (string) ($c['destination_app_id'] ?? '');
    $site = !empty($c['public_domain']) ? 'https://' . preg_replace('#^https?://#', '', (string) $c['public_domain']) : null;

    $orgId = org_find_or_create((string) $c['name'], 'chamber', ['town' => $c['city'] ?? null, 'state' => $c['state'] ?? null, 'website' => $site]);
    $contactId = null;
    if (!empty($c['contact_name']) || !empty($c['contact_email'])) {
      $contactId = contact_find_or_create($orgId, (string) (($c['contact_name'] ?? null) ?: $c['contact_email']), ($c['contact_email'] ?? null) ?: null, ($c['contact_phone'] ?? null) ?: null, 'Chamber contact');
    }

    $ch = null;
    if ($appId !== '') {
      $st = db()->prepare('SELECT * FROM chambers WHERE base44_app_id = ? LIMIT 1');
      $st->execute([$appId]);
      $ch = $st->fetch() ?: null;
    }
    if (!$ch) {
      $st = db()->prepare('SELECT * FROM chambers WHERE LOWER(name) = LOWER(?) LIMIT 1');
      $st->execute([$c['name']]);
      $ch = $st->fetch() ?: null;
    }
    if ($ch) {
      // Fill only what HQ doesn't know yet; never overwrite.
      db()->prepare('UPDATE chambers SET town = COALESCE(town, ?), state = COALESCE(state, ?), site_url = COALESCE(site_url, ?),
        base44_app_id = COALESCE(base44_app_id, ?), org_id = COALESCE(org_id, ?), updated_at = ? WHERE id = ?')
        ->execute([($c['city'] ?? null) ?: null, ($c['state'] ?? null) ?: null, $site, $appId ?: null, $orgId, now(), $ch['id']]);
      $chamberId = (int) $ch['id'];
      $log[] = "Updated chamber {$c['name']}";
    } else {
      db()->prepare('INSERT INTO chambers (name, town, state, status, plan, org_id, site_url, base44_app_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute([mb_substr((string) $c['name'], 0, 190), ($c['city'] ?? null) ?: null, ($c['state'] ?? null) ?: null, 'onboarding', 'founding', $orgId, $site, $appId ?: null, now(), now()]);
      $chamberId = (int) db()->lastInsertId();
      $log[] = "Added chamber {$c['name']}";
    }

    $tasks = $byChamber('verification_tasks', (string) $c['id']);
    $packages = $byChamber('packages', (string) $c['id']);
    $checks = $byChamber('verifications', (string) $c['id']);
    $blockers = $c['ready_blockers'] ?? [];

    // The full setup record as a doc.
    $md = "# {$c['name']}: setup record\n\nImported from the Base44 Setup Manager on " . gmdate('M j, Y') . ".\n\n"
      . "- **Setup status:** " . ($c['setup_status'] ?? '') . " (last wizard step: " . ($c['last_wizard_step'] ?? '') . ")\n"
      . "- **Base44 app:** " . ($appId ?: 'none') . "\n"
      . "- **Template version:** cloned from " . (($c['source_template_version'] ?? null) ?: '?') . ", target " . (($c['target_version'] ?? null) ?: '?')
      . ", verified installed " . (($c['verified_installed_version'] ?? null) ?: 'none') . "\n"
      . "- **Public domain:** " . (($c['public_domain'] ?? null) ?: 'none') . " · time zone " . ($c['timezone'] ?? '') . "\n"
      . "- **Contact:** " . trim(($c['contact_name'] ?? '') . ' ' . ($c['contact_email'] ?? '') . ' ' . ($c['contact_phone'] ?? '')) . "\n"
      . "- **Brand colors:** " . ($c['brand_color_primary'] ?? '') . ' ' . ($c['brand_color_secondary'] ?? '') . "\n\n";
    if (!empty($c['notes'])) $md .= "## Notes\n\n" . $c['notes'] . "\n\n";
    if ($tasks) {
      $md .= "## Launch checklist\n\n";
      foreach ($tasks as $t) $md .= '- [' . (($t['status'] ?? '') === 'verified' ? 'x' : ' ') . '] ' . $t['title'] . ' (' . ($t['status'] ?? '') . ")\n";
      $md .= "\n";
    }
    if ($packages || $checks) {
      $md .= "## Upgrade packages and checks\n\n";
      foreach ($packages as $p) $md .= "- Package {$p['label']} ({$p['package_type']}, {$p['designation']}) " . sm_date($p['generated_at'] ?? null) . "\n";
      foreach ($checks as $v) $md .= "- Check for {$v['target_version']} " . sm_date($v['verified_date'] ?? null) . ': ' . (($v['notes'] ?? null) ?: 'no notes') . "\n";
      $md .= "\n";
    }
    if (!empty($c['selected_features'])) $md .= "## Selected features (" . count($c['selected_features']) . ")\n\n" . implode(', ', $c['selected_features']) . "\n\n";
    if ($blockers) {
      $md .= "## Open items when exported (" . count($blockers) . ")\n\n";
      foreach ($blockers as $b) $md .= '- ' . preg_replace('/^Unresolved requirement:\s*/', '', (string) $b) . "\n";
    }
    sm_doc_upsert("{$c['name']}: setup record", $md, 'setup manager, ' . strtolower((string) $c['name']));

    // First import only: a note on the chamber and its open checklist items as HQ tasks.
    $flag = 'sm_imported_' . preg_replace('/\W/', '', (string) $c['id']);
    if (!setting($flag)) {
      $open = array_filter($tasks, fn($t) => ($t['status'] ?? '') !== 'verified');
      foreach ($open as $t) {
        db()->prepare('INSERT INTO tasks (title, chamber_id, org_id, created_at) VALUES (?,?,?,?)')
          ->execute([mb_substr("{$c['name']}: {$t['title']}", 0, 255), $chamberId, $orgId, now()]);
      }
      add_activity(['chamber_id' => $chamberId, 'org_id' => $orgId, 'contact_id' => $contactId], 'system',
        "Imported from the Setup Manager: setup " . ($c['setup_status'] ?? '?') . ', ' . count($open) . ' launch checklist items open, '
        . count($blockers) . " open setup items. Full record in Docs → Setup Manager.");
      set_setting($flag, now());
      $log[] = 'Added ' . count($open) . " tasks for {$c['name']}";
    }
  }

  // Template release history as one doc.
  $releases = array_values(array_filter($data['releases'] ?? [], fn($r) => !sm_is_sample($r)));
  if ($releases) {
    $handoffs = [];
    foreach ($data['handoffs'] ?? [] as $hnd) if (!empty($hnd['linked_release_id'])) $handoffs[$hnd['linked_release_id']] = $hnd;
    usort($releases, fn($a, $b) => strcmp((string) ($a['created_date'] ?? ''), (string) ($b['created_date'] ?? '')));
    $md = "# Core template release history\n\nImported from the Base44 Setup Manager on " . gmdate('M j, Y')
      . ". These were the template releases tracked there (oldest first). Changes now ship through the PWA updates and the core template directly.\n\n";
    foreach ($releases as $r) {
      $md .= "## {$r['version']}: {$r['label']}\n\n";
      $md .= '*' . ($r['rollout_status'] ?? 'draft') . ', ' . sm_date($r['created_date'] ?? null) . "*\n\n";
      if (!empty($r['summary'])) $md .= $r['summary'] . "\n\n";
      if ($hnd = $handoffs[$r['id']] ?? null) $md .= "Came from: {$hnd['title']} (source app {$hnd['source_app_id']}).\n\n";
      if (!empty($r['verification_steps'])) $md .= "Checks:\n" . implode("\n", array_map(fn($s) => "- $s", $r['verification_steps'])) . "\n\n";
      if (!empty($r['secret_names'])) $md .= 'Secrets: ' . implode(', ', $r['secret_names']) . "\n\n";
    }
    sm_doc_upsert('Core template release history', $md, 'setup manager, releases, core template');
    $log[] = 'Saved ' . count($releases) . ' releases as a doc';
  }
  set_setting('sm_import_last', now());
  return $log;
}
