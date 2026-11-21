<?php
/**
 * Import chambers into the Chamber pipeline from a CSV (or a Markdown table), one state at a time.
 *
 * Columns: name, city, state, website, phone, email, contact_name, contact_title, source_url.
 * Flow: upload or paste → preview (nothing saved) → import.
 * New chambers become a "prospect" organization with a lead in the Prospect stage.
 * A chamber already in HQ (same name and state) is never duplicated: the import only fills in its blank fields.
 */

declare(strict_types=1);

const IMPORT_MAX_ROWS = 3000;
const IMPORT_FIELDS = ['name', 'city', 'state', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'source_url'];

/** Header spellings we accept => our column. */
const IMPORT_ALIASES = [
  'name' => 'name', 'chamber' => 'name', 'chamber_name' => 'name', 'organization' => 'name', 'organization_name' => 'name', 'org' => 'name', 'chamber_of_commerce' => 'name',
  'city' => 'city', 'town' => 'city', 'city_town' => 'city', 'location' => 'city',
  'state' => 'state', 'st' => 'state', 'state_abbreviation' => 'state',
  'website' => 'website', 'url' => 'website', 'website_url' => 'website', 'web' => 'website', 'site' => 'website',
  'phone' => 'phone', 'phone_number' => 'phone', 'telephone' => 'phone',
  'email' => 'email', 'email_address' => 'email', 'e_mail' => 'email',
  'contact_name' => 'contact_name', 'contact' => 'contact_name', 'director' => 'contact_name', 'executive_director' => 'contact_name', 'president' => 'contact_name',
  'contact_title' => 'contact_title', 'title' => 'contact_title', 'role' => 'contact_title',
  'source_url' => 'source_url', 'source' => 'source_url', 'source_link' => 'source_url',
];

const US_STATES = [
  'AL' => 'Alabama', 'AK' => 'Alaska', 'AZ' => 'Arizona', 'AR' => 'Arkansas', 'CA' => 'California', 'CO' => 'Colorado', 'CT' => 'Connecticut',
  'DE' => 'Delaware', 'DC' => 'District of Columbia', 'FL' => 'Florida', 'GA' => 'Georgia', 'HI' => 'Hawaii', 'ID' => 'Idaho', 'IL' => 'Illinois',
  'IN' => 'Indiana', 'IA' => 'Iowa', 'KS' => 'Kansas', 'KY' => 'Kentucky', 'LA' => 'Louisiana', 'ME' => 'Maine', 'MD' => 'Maryland',
  'MA' => 'Massachusetts', 'MI' => 'Michigan', 'MN' => 'Minnesota', 'MS' => 'Mississippi', 'MO' => 'Missouri', 'MT' => 'Montana', 'NE' => 'Nebraska',
  'NV' => 'Nevada', 'NH' => 'New Hampshire', 'NJ' => 'New Jersey', 'NM' => 'New Mexico', 'NY' => 'New York', 'NC' => 'North Carolina',
  'ND' => 'North Dakota', 'OH' => 'Ohio', 'OK' => 'Oklahoma', 'OR' => 'Oregon', 'PA' => 'Pennsylvania', 'PR' => 'Puerto Rico', 'RI' => 'Rhode Island',
  'SC' => 'South Carolina', 'SD' => 'South Dakota', 'TN' => 'Tennessee', 'TX' => 'Texas', 'UT' => 'Utah', 'VT' => 'Vermont', 'VA' => 'Virginia',
  'WA' => 'Washington', 'WV' => 'West Virginia', 'WI' => 'Wisconsin', 'WY' => 'Wyoming',
];

/** "TX", "tx", "Texas", "texas." => "TX". Unknown => null. */
function us_state(?string $v): ?string {
  $v = trim((string) $v, " \t.");
  if ($v === '') return null;
  $up = strtoupper($v);
  if (isset(US_STATES[$up])) return $up;
  foreach (US_STATES as $abbr => $name) if (strcasecmp($name, $v) === 0) return $abbr;
  return null;
}

/** The spellings an org's state might be saved as, for matching ("TX" and "Texas"). */
function state_spellings(string $abbr): array {
  return isset(US_STATES[$abbr]) ? [$abbr, US_STATES[$abbr]] : [$abbr];
}

/** Name key for duplicate checks: case, "&"/"and", punctuation and extra spaces don't matter. */
function import_name_key(string $name): string {
  $n = mb_strtolower($name);
  $n = str_replace(['&', '+'], ' and ', $n);
  $n = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $n);
  return trim(preg_replace('/\s+/', ' ', $n));
}

function import_blank(?string $v): bool {
  $v = strtolower(trim((string) $v));
  return in_array($v, ['', 'n/a', 'na', '-', '—', 'none', 'unknown', 'null', 'not listed', 'not found', 'tbd', '?'], true);
}

/**
 * Turn the text of a CSV file or a Markdown table into rows of our columns.
 * @return array{rows: array<int, array<string,string>>, unknown: string[], error: ?string}
 */
function import_parse(string $text): array {
  $text = preg_replace('/^\xEF\xBB\xBF/', '', $text);
  $text = str_replace(["\r\n", "\r"], "\n", $text);
  $lines = explode("\n", $text);
  // Drop code fences (```csv … ```) that AI tools wrap around their output.
  $lines = array_values(array_filter($lines, fn($l) => !preg_match('/^\s*```/', $l)));

  $isTable = count(array_filter($lines, fn($l) => preg_match('/^\s*\|.*\|\s*$/', $l))) >= 2;
  $raw = [];
  if ($isTable) {
    foreach ($lines as $l) {
      if (!preg_match('/^\s*\|(.*)\|\s*$/', $l, $m)) continue;
      if (preg_match('/^[\s|:\-]+$/', $m[1])) continue; // the |---|---| line
      $raw[] = array_map(fn($c) => trim(str_replace('\|', '|', $c)), preg_split('/(?<!\\\\)\|/', $m[1]));
    }
  } else {
    $body = implode("\n", $lines);
    $first = '';
    foreach ($lines as $l) if (trim($l) !== '' && preg_match('/name/i', $l)) { $first = $l; break; }
    $delim = ',';
    if (substr_count($first, "\t") > substr_count($first, ',')) $delim = "\t";
    elseif (substr_count($first, ';') > substr_count($first, ',')) $delim = ';';
    $fh = fopen('php://temp', 'r+');
    fwrite($fh, $body);
    rewind($fh);
    while (($r = fgetcsv($fh, 0, $delim, '"', '')) !== false) {
      if ($r === [null]) continue;
      $raw[] = array_map(fn($c) => trim((string) $c), $r);
    }
    fclose($fh);
  }

  // Find the header row: the first row with a name column.
  $map = null;
  $unknown = [];
  $out = [];
  foreach ($raw as $r) {
    $keys = array_map(fn($c) => trim(preg_replace('/[^a-z0-9]+/', '_', strtolower(str_replace(['*', '`'], '', $c))), '_'), $r);
    $asHeader = array_map(fn($k) => IMPORT_ALIASES[$k] ?? null, $keys);
    if (in_array('name', $asHeader, true) && count(array_filter($asHeader)) >= 2) {
      // A header (the first one, or a repeated one between batches)
      if ($map === null) {
        $map = $asHeader;
        foreach ($keys as $i => $k) if ($k !== '' && $asHeader[$i] === null) $unknown[] = $r[$i];
      }
      continue;
    }
    if ($map === null) continue;
    if (!array_filter($r, fn($c) => $c !== '')) continue;
    // A stray sentence after the list ("Total: 42 rows.") is one cell, not a chamber.
    if (count(array_filter($r, fn($c) => $c !== '')) === 1 && count($r) === 1 && count(array_filter($map)) >= 3) continue;
    $row = array_fill_keys(IMPORT_FIELDS, '');
    foreach ($map as $i => $field) {
      if ($field === null || !isset($r[$i])) continue;
      $v = trim(str_replace(['**', '`'], '', $r[$i]));
      // Markdown links: [text](url) → url for links, text otherwise
      if (preg_match('/^\[([^\]]*)\]\(([^)]+)\)$/', $v, $m)) $v = in_array($field, ['website', 'source_url'], true) ? $m[2] : $m[1];
      if (preg_match('/^mailto:(.+)$/i', $v, $m)) $v = $m[1];
      if ($row[$field] === '' && !import_blank($v)) $row[$field] = $v;
    }
    $out[] = $row;
    if (count($out) > IMPORT_MAX_ROWS) {
      return ['rows' => [], 'unknown' => [], 'error' => 'That file has more than ' . IMPORT_MAX_ROWS . ' rows. Split it into smaller files (one state at a time works best).'];
    }
  }
  if ($map === null) return ['rows' => [], 'unknown' => [], 'error' => 'No header row was found. The first row needs column names, including "name" (for example: name,city,state,website,phone,email,contact_name,contact_title,source_url).'];
  return ['rows' => $out, 'unknown' => $unknown, 'error' => null];
}

/** Tidy one parsed row. Returns [clean row, problems (row is skipped), notes (a value was dropped)]. */
function import_clean(array $r, ?string $fallbackState): array {
  $problems = [];
  $notes = [];
  $c = [];
  $c['name'] = mb_substr(preg_replace('/\s+/', ' ', $r['name']), 0, 190);
  if ($c['name'] === '') $problems[] = 'No name';
  $c['city'] = $r['city'] !== '' ? mb_substr($r['city'], 0, 120) : null;
  $st = us_state($r['state']);
  if ($st === null && $r['state'] === '' && $fallbackState) $st = $fallbackState;
  if ($st === null) $problems[] = $r['state'] === '' ? 'No state' : 'Unknown state "' . mb_substr($r['state'], 0, 30) . '"';
  $c['state'] = $st;
  $c['website'] = null;
  if ($r['website'] !== '') {
    $u = $r['website'];
    if (!preg_match('#^https?://#i', $u)) $u = 'https://' . $u;
    if (filter_var($u, FILTER_VALIDATE_URL) && str_contains((string) parse_url($u, PHP_URL_HOST), '.')) $c['website'] = rtrim(mb_substr($u, 0, 255), '/');
    else $notes[] = 'website "' . mb_substr($r['website'], 0, 40) . '" skipped';
  }
  $c['phone'] = $r['phone'] !== '' ? mb_substr($r['phone'], 0, 60) : null;
  $c['email'] = null;
  if ($r['email'] !== '') {
    $e = strtolower($r['email']);
    if (filter_var($e, FILTER_VALIDATE_EMAIL)) $c['email'] = mb_substr($e, 0, 190);
    else $notes[] = 'email "' . mb_substr($r['email'], 0, 40) . '" skipped';
  }
  $c['contact_name'] = $r['contact_name'] !== '' ? mb_substr($r['contact_name'], 0, 190) : null;
  $c['contact_title'] = $r['contact_title'] !== '' ? mb_substr($r['contact_title'], 0, 120) : null;
  $c['source_url'] = null;
  if ($r['source_url'] !== '') {
    $u = $r['source_url'];
    if (!preg_match('#^https?://#i', $u)) $u = 'https://' . $u;
    if (filter_var($u, FILTER_VALIDATE_URL)) $c['source_url'] = mb_substr($u, 0, 255);
  }
  return [$c, $problems, $notes];
}

/** Org field => CSV field, for filling in blanks. */
const IMPORT_ORG_FILL = ['town' => 'city', 'state' => 'state', 'website' => 'website', 'phone' => 'phone', 'email' => 'email', 'source_url' => 'source_url'];
const IMPORT_FIELD_LABELS = ['town' => 'city', 'state' => 'state', 'website' => 'website', 'phone' => 'phone', 'email' => 'email', 'source_url' => 'source link',
  'contact' => 'contact', 'title' => 'contact title', 'contact_email' => 'contact email', 'contact_phone' => 'contact phone', 'lead' => 'pipeline lead'];

/**
 * Work out what importing each row would do, without saving anything.
 * Each plan row: action new|update|same|skip, plus what it would fill in.
 */
function import_plan(array $parsed, ?string $fallbackState): array {
  // Every org once, keyed by name (+ state) so the check is quick and forgiving about spelling.
  $orgs = [];
  foreach (rows('SELECT id, name, kind, town, state, website, phone, email, source_url FROM orgs') as $o) {
    $orgs[import_name_key($o['name'])][] = $o;
  }
  $chamberDeal = [];
  foreach (rows("SELECT id, org_id, contact_id, stage FROM deals WHERE pipeline = 'chamber' AND org_id IS NOT NULL ORDER BY updated_at DESC") as $d) {
    $chamberDeal[(int) $d['org_id']] ??= $d;
  }
  $customer = array_flip(array_map('intval', array_column(rows('SELECT org_id FROM chambers WHERE org_id IS NOT NULL'), 'org_id')));

  $plan = [];
  $seen = [];
  foreach ($parsed as $i => $r) {
    [$c, $problems, $notes] = import_clean($r, $fallbackState);
    $p = ['line' => $i + 1, 'row' => $c, 'notes' => $notes, 'fill' => [], 'org_id' => null, 'org_name' => null];
    if ($problems) {
      $plan[] = $p + ['action' => 'skip', 'why' => implode(', ', $problems)];
      continue;
    }
    $key = import_name_key($c['name']) . '|' . $c['state'];
    if (isset($seen[$key])) {
      // Same chamber twice in the file: fold its extra details into the first row.
      $first = &$plan[$seen[$key]];
      foreach ($c as $f => $v) if ($v !== null && ($first['row'][$f] ?? null) === null) $first['row'][$f] = $v;
      unset($first);
      $plan[] = $p + ['action' => 'skip', 'why' => 'Repeats row ' . $plan[$seen[$key]]['line']];
      continue;
    }
    $seen[$key] = count($plan);
    $match = null;
    foreach ($orgs[import_name_key($c['name'])] ?? [] as $o) {
      $ost = us_state($o['state']);
      if ($ost === $c['state']) { $match = $o; break; }
      if ($ost === null && trim((string) $o['state']) === '' && !$match) $match = $o; // saved without a state
    }
    if (!$match) {
      $plan[] = $p + ['action' => 'new', 'why' => ''];
      continue;
    }
    $p['org_id'] = (int) $match['id'];
    $p['org_name'] = $match['name'];
    $p['org'] = $match;
    $p['deal'] = $chamberDeal[(int) $match['id']] ?? null;
    $p['customer'] = isset($customer[(int) $match['id']]) || $match['kind'] === 'chamber';
    $plan[] = $p + ['action' => 'update', 'why' => ''];
  }

  // Now that repeated rows are folded in, work out what each existing chamber would get.
  foreach ($plan as &$p) {
    if ($p['action'] !== 'update') continue;
    $p['fill'] = import_fills($p);
    if (!$p['fill']) { $p['action'] = 'same'; $p['why'] = 'Already in HQ, nothing new to add'; }
    unset($p['org']);
  }
  unset($p);
  return $plan;
}

/** Which blank fields an existing chamber would get from its row. */
function import_fills(array $p): array {
  $c = $p['row'];
  $o = $p['org'];
  $fill = [];
  foreach (IMPORT_ORG_FILL as $of => $cf) {
    if (trim((string) ($o[$of] ?? '')) === '' && $c[$cf] !== null) $fill[] = $of;
  }
  if ($c['contact_name']) {
    $ct = rows('SELECT id, title, email, phone FROM contacts WHERE org_id = ? AND LOWER(name) = LOWER(?) LIMIT 1', [$o['id'], $c['contact_name']])[0] ?? null;
    if (!$ct) $fill[] = 'contact';
    else {
      if (trim((string) $ct['title']) === '' && $c['contact_title']) $fill[] = 'title';
      if (trim((string) $ct['email']) === '' && $c['email'] && !import_email_taken($c['email'], (int) $ct['id'])) $fill[] = 'contact_email';
      if (trim((string) $ct['phone']) === '' && $c['phone']) $fill[] = 'contact_phone';
    }
  }
  if (!$p['deal'] && !$p['customer']) $fill[] = 'lead';
  return $fill;
}

function import_email_taken(string $email, int $exceptId = 0): bool {
  return (bool) rows('SELECT id FROM contacts WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1', [$email, $exceptId]);
}

/** Save the plan. Returns counts. */
function import_apply(array $plan, string $fileLabel): array {
  $n = ['new' => 0, 'updated' => 0, 'same' => 0, 'skipped' => 0];
  $pdo = db();
  $pdo->beginTransaction();
  try {
    foreach ($plan as $p) {
      $c = $p['row'];
      if ($p['action'] === 'skip') { $n['skipped']++; continue; }
      if ($p['action'] === 'same') { $n['same']++; continue; }
      if ($p['action'] === 'new') {
        $pdo->prepare('INSERT INTO orgs (name, kind, town, state, website, phone, email, source_url, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
          ->execute([$c['name'], 'prospect', $c['city'], $c['state'], $c['website'], $c['phone'], $c['email'], $c['source_url'], now(), now()]);
        $orgId = (int) $pdo->lastInsertId();
        $contactId = null;
        if ($c['contact_name']) {
          $email = $c['email'] && !import_email_taken($c['email']) ? $c['email'] : null;
          $pdo->prepare('INSERT INTO contacts (org_id, name, title, email, phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
            ->execute([$orgId, $c['contact_name'], $c['contact_title'], $email, $c['phone'], now(), now()]);
          $contactId = (int) $pdo->lastInsertId();
        }
        $pdo->prepare('INSERT INTO deals (org_id, contact_id, pipeline, title, stage, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
          ->execute([$orgId, $contactId, 'chamber', $c['name'], 'prospect', 'CSV import', now(), now()]);
        $dealId = (int) $pdo->lastInsertId();
        add_activity(['org_id' => $orgId, 'deal_id' => $dealId, 'contact_id' => $contactId], 'system',
          "Imported from $fileLabel." . ($c['source_url'] ? "\nFound at: {$c['source_url']}" : ''));
        $n['new']++;
        continue;
      }
      // update: fill blanks only, never overwrite
      $orgId = (int) $p['org_id'];
      $o = row('orgs', $orgId);
      if (!$o) { $n['skipped']++; continue; }
      $deal = rows("SELECT id, contact_id FROM deals WHERE pipeline = 'chamber' AND org_id = ? ORDER BY updated_at DESC LIMIT 1", [$orgId])[0] ?? null;
      $isCustomer = $o['kind'] === 'chamber' || rows('SELECT id FROM chambers WHERE org_id = ? LIMIT 1', [$orgId]);
      $done = [];
      $sets = [];
      $args = [];
      foreach (IMPORT_ORG_FILL as $of => $cf) {
        if (trim((string) ($o[$of] ?? '')) === '' && $c[$cf] !== null) { $sets[] = "`$of` = ?"; $args[] = $c[$cf]; $done[] = $of; }
      }
      if ($sets) $pdo->prepare('UPDATE orgs SET ' . implode(', ', $sets) . ', updated_at = ? WHERE id = ?')->execute([...$args, now(), $orgId]);
      $contactId = null;
      if ($c['contact_name']) {
        $ct = rows('SELECT * FROM contacts WHERE org_id = ? AND LOWER(name) = LOWER(?) LIMIT 1', [$orgId, $c['contact_name']])[0] ?? null;
        if (!$ct) {
          $email = $c['email'] && !import_email_taken($c['email']) ? $c['email'] : null;
          $pdo->prepare('INSERT INTO contacts (org_id, name, title, email, phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
            ->execute([$orgId, $c['contact_name'], $c['contact_title'], $email, $c['phone'], now(), now()]);
          $contactId = (int) $pdo->lastInsertId();
          $done[] = 'contact';
        } else {
          $contactId = (int) $ct['id'];
          $cs = [];
          $ca = [];
          if (trim((string) $ct['title']) === '' && $c['contact_title']) { $cs[] = 'title = ?'; $ca[] = $c['contact_title']; $done[] = 'title'; }
          if (trim((string) $ct['email']) === '' && $c['email'] && !import_email_taken($c['email'], $contactId)) { $cs[] = 'email = ?'; $ca[] = $c['email']; $done[] = 'contact_email'; }
          if (trim((string) $ct['phone']) === '' && $c['phone']) { $cs[] = 'phone = ?'; $ca[] = $c['phone']; $done[] = 'contact_phone'; }
          if ($cs) $pdo->prepare('UPDATE contacts SET ' . implode(', ', $cs) . ', updated_at = ? WHERE id = ?')->execute([...$ca, now(), $contactId]);
        }
      }
      $dealId = $deal ? (int) $deal['id'] : null;
      if (!$deal && !$isCustomer) {
        $pdo->prepare('INSERT INTO deals (org_id, contact_id, pipeline, title, stage, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
          ->execute([$orgId, $contactId, 'chamber', $o['name'], 'prospect', 'CSV import', now(), now()]);
        $dealId = (int) $pdo->lastInsertId();
        $done[] = 'lead';
      } elseif ($deal && !$deal['contact_id'] && $contactId) {
        $pdo->prepare('UPDATE deals SET contact_id = ? WHERE id = ?')->execute([$contactId, $dealId]);
      }
      if (!$done) { $n['same']++; continue; }
      add_activity(['org_id' => $orgId, 'deal_id' => $dealId, 'contact_id' => $contactId], 'system',
        "Filled in from $fileLabel: " . implode(', ', array_map(fn($f) => IMPORT_FIELD_LABELS[$f] ?? $f, $done)) . '.');
      $n['updated']++;
    }
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
  return $n;
}

// =====================================================================
// screens and actions

function import_action(string $p): void {
  start_session();
  if ($p === 'lead_import_preview') {
    $label = 'pasted list';
    $text = '';
    $f = $_FILES['file'] ?? null;
    if ($f && ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK && is_uploaded_file($f['tmp_name'])) {
      if ($f['size'] > 5 * 1024 * 1024) { flash('That file is over 5 MB. Split it into smaller files.', 'err'); redirect('index.php?p=lead_import'); }
      $text = (string) file_get_contents($f['tmp_name']);
      $label = mb_substr(basename((string) $f['name']), 0, 80);
    } elseif ($f && ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
      flash('The file did not upload. Try again, or paste the list instead.', 'err');
      redirect('index.php?p=lead_import');
    }
    if (trim($text) === '') $text = (string) ($_POST['text'] ?? '');
    if (trim($text) === '') { flash('Choose a file or paste the list first.', 'err'); redirect('index.php?p=lead_import'); }
    if (!mb_check_encoding($text, 'UTF-8')) $text = mb_convert_encoding($text, 'UTF-8', 'Windows-1252');
    $parsed = import_parse($text);
    if ($parsed['error']) { flash($parsed['error'], 'err'); redirect('index.php?p=lead_import'); }
    if (!$parsed['rows']) { flash('The header was found but there are no rows under it.', 'err'); redirect('index.php?p=lead_import'); }
    $_SESSION['lead_import'] = [
      'rows' => $parsed['rows'], 'unknown' => $parsed['unknown'], 'label' => $label,
      'state' => us_state($_POST['state'] ?? null), 'at' => time(),
    ];
    redirect('index.php?p=lead_import&step=preview');
  }
  if ($p === 'lead_import_run') {
    $imp = $_SESSION['lead_import'] ?? null;
    if (!$imp || ($_POST['at'] ?? '') !== (string) $imp['at']) {
      flash('That preview has expired. Upload the file again.', 'err');
      redirect('index.php?p=lead_import');
    }
    $plan = import_plan($imp['rows'], $imp['state']);
    $n = import_apply($plan, $imp['label']);
    unset($_SESSION['lead_import']);
    $states = array_values(array_unique(array_filter(array_map(fn($p) => $p['action'] !== 'skip' ? $p['row']['state'] : null, $plan))));
    log_activity(null, 'Imported chambers', "{$imp['label']}: {$n['new']} new, {$n['updated']} filled in, {$n['same']} unchanged, {$n['skipped']} skipped");
    flash("Imported {$imp['label']}: {$n['new']} new " . ($n['new'] === 1 ? 'chamber' : 'chambers') . " added to Prospect, {$n['updated']} filled in, {$n['same']} already up to date, {$n['skipped']} skipped.");
    redirect('index.php?p=leads&pipeline=chamber&view=list' . (count($states) === 1 ? '&state=' . $states[0] : ''));
  }
  if ($p === 'lead_import_cancel') {
    unset($_SESSION['lead_import']);
    redirect('index.php?p=lead_import');
  }
}

function import_template(): void {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="chambers-template.csv"');
  $out = fopen('php://output', 'w');
  fputcsv($out, IMPORT_FIELDS, ',', '"', '');
  fputcsv($out, ['Example Chamber of Commerce', 'Example City', 'TX', 'https://examplechamber.org', '(806) 555-1234', 'info@examplechamber.org', 'Pat Smith', 'Executive Director', 'https://www.uschamber.com/co/chambers'], ',', '"', '');
  fclose($out);
}

function import_screen(): void {
  start_session();
  $imp = $_SESSION['lead_import'] ?? null;
  $preview = ($_GET['step'] ?? '') === 'preview' && $imp;
  page_start('Import chambers', 'leads');
  ?>
  <p class="crumbs"><a href="index.php?p=leads&pipeline=chamber">← Chamber pipeline</a></p>
  <?php if (!$preview): ?>
    <div class="head"><h1>Import chambers</h1></div>
    <div class="cols wide-left">
      <section class="card">
        <h2>Upload a list</h2>
        <p class="muted small">One state per file works best. You'll see a preview before anything is saved.</p>
        <form method="post" action="index.php?p=lead_import_preview" enctype="multipart/form-data" class="stack">
          <?= csrf_field() ?>
          <label>CSV file <input type="file" name="file" accept=".csv,.txt,.md,.tsv,text/csv,text/plain,text/markdown"></label>
          <label>Or paste it here <textarea name="text" rows="8" placeholder="name,city,state,website,phone,email,contact_name,contact_title,source_url&#10;Muleshoe Chamber of Commerce,Muleshoe,TX,https://…"></textarea></label>
          <label>State for rows that don't list one
            <select name="state"><option value="">None (skip those rows)</option><?php foreach (US_STATES as $a => $n): ?><option value="<?= h($a) ?>"><?= h($n) ?></option><?php endforeach; ?></select>
          </label>
          <div><button class="primary">Preview</button></div>
        </form>
      </section>
      <section class="card">
        <h2>The format</h2>
        <p class="small">A header row, then one row per chamber:</p>
        <p><code class="mono wrap">name,city,state,website,phone,email,contact_name,contact_title,source_url</code></p>
        <ul class="small">
          <li>Only <strong>name</strong> and <strong>state</strong> are needed. Leave the rest blank when you don't know them.</li>
          <li>State can be <span class="mono">TX</span> or <span class="mono">Texas</span>.</li>
          <li>A Markdown table with the same columns works too, so you can paste the .md file straight from the AI tool.</li>
          <li>New chambers go into the <strong>Prospect</strong> stage. They don't get follow-up dates or announcement emails until you move them on.</li>
          <li>A chamber already in HQ (same name and state) is not added again. Importing a file again only fills in fields that are still blank, so you can add websites and contacts later and re-import.</li>
        </ul>
        <p class="small"><a href="index.php?p=lead_import_template">Download a blank template</a></p>
      </section>
    </div>
  <?php else:
    $plan = import_plan($imp['rows'], $imp['state']);
    $count = ['new' => 0, 'update' => 0, 'same' => 0, 'skip' => 0];
    foreach ($plan as $p) $count[$p['action']]++;
    $states = array_count_values(array_filter(array_map(fn($p) => $p['action'] !== 'skip' ? $p['row']['state'] : null, $plan)));
    ksort($states);
    $badge = ['new' => ['New', 'ok'], 'update' => ['Fill in', 'blue'], 'same' => ['No change', 'gray'], 'skip' => ['Skipped', 'warn']];
    ?>
    <div class="head"><h1>Preview: <?= h($imp['label']) ?></h1></div>
    <section class="card">
      <p><strong><?= $count['new'] ?></strong> new <?= $count['new'] === 1 ? 'chamber' : 'chambers' ?> ·
        <strong><?= $count['update'] ?></strong> already in HQ with details to fill in ·
        <strong><?= $count['same'] ?></strong> already up to date ·
        <strong><?= $count['skip'] ?></strong> skipped
        <?php if ($states): ?><span class="muted small"> · <?= h(implode(', ', array_map(fn($s, $n) => "$s ($n)", array_keys($states), $states))) ?></span><?php endif; ?></p>
      <?php if ($imp['unknown']): ?><p class="small muted">Columns ignored: <?= h(implode(', ', $imp['unknown'])) ?></p><?php endif; ?>
      <p class="small muted">Nothing is saved yet. Existing details are never overwritten.</p>
      <div class="row">
        <?php if ($count['new'] + $count['update'] > 0): ?>
          <form method="post" action="index.php?p=lead_import_run" class="inline"><?= csrf_field() ?><input type="hidden" name="at" value="<?= (int) $imp['at'] ?>">
            <button class="primary">Import <?= $count['new'] + $count['update'] ?> <?= $count['new'] + $count['update'] === 1 ? 'chamber' : 'chambers' ?></button></form>
        <?php else: ?><p class="muted">There's nothing new to import.</p><?php endif; ?>
        <form method="post" action="index.php?p=lead_import_cancel" class="inline"><?= csrf_field() ?><button>Cancel</button></form>
      </div>
    </section>
    <section class="card">
      <table class="tbl">
        <thead><tr><th>#</th><th>What happens</th><th>Chamber</th><th>City</th><th>State</th><th>Website</th><th>Phone</th><th>Email</th><th>Contact</th></tr></thead>
        <tbody>
        <?php foreach ($plan as $p): $c = $p['row']; [$bl, $bc] = $badge[$p['action']]; ?>
          <tr>
            <td class="small muted"><?= (int) $p['line'] ?></td>
            <td class="small"><?= badge($bl, $bc) ?>
              <?php if ($p['action'] === 'update'): ?><div class="muted">Adds <?= h(implode(', ', array_map(fn($f) => IMPORT_FIELD_LABELS[$f] ?? $f, $p['fill']))) ?></div><?php endif; ?>
              <?php if ($p['why']): ?><div class="muted"><?= h($p['why']) ?></div><?php endif; ?>
              <?php if ($p['notes']): ?><div class="muted"><?= h(implode('; ', $p['notes'])) ?></div><?php endif; ?>
            </td>
            <td><?php if ($p['org_id']): ?><a href="index.php?p=org&id=<?= (int) $p['org_id'] ?>"><?= h($c['name']) ?></a><?php else: ?><?= h($c['name']) ?><?php endif; ?></td>
            <td class="small"><?= h($c['city'] ?? '') ?></td>
            <td class="small"><?= h($c['state'] ?? '') ?></td>
            <td class="small"><?= $c['website'] ? h(preg_replace('#^https?://(www\.)?#', '', $c['website'])) : '' ?></td>
            <td class="small nowrap"><?= h($c['phone'] ?? '') ?></td>
            <td class="small"><?= h($c['email'] ?? '') ?></td>
            <td class="small"><?= h(trim(($c['contact_name'] ?? '') . ($c['contact_title'] ? ', ' . $c['contact_title'] : ''), ', ')) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </section>
  <?php endif;
  page_end();
}
