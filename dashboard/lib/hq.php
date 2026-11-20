<?php
/**
 * Chamber Loop HQ: chambers on the Base44 platform, the CRM, the docs library and Ask HQ.
 * Data helpers only; the screens are in hq_pages.php.
 */

declare(strict_types=1);

// ---------------- fixed lists ----------------

/** Plan key => [label, default monthly price in USD] */
const HQ_PLANS = [
  'founding' => ['Sponsored · founding', 99],
  'sponsored' => ['Sponsored · 150–499 members', 150],
  'sponsored_large' => ['Sponsored · 500+ members', 250],
  'direct' => ['Direct (no sponsor)', 49],
  'lite' => ['Free Lite (no AI)', 0],
  'demo' => ['Demo', 0],
];

const HQ_CHAMBER_STATUS = [
  'onboarding' => ['Onboarding', 'blue'],
  'live' => ['Live', 'ok'],
  'grace' => ['Sponsor grace period', 'warn'],
  'paused' => ['Paused', 'gray'],
];

const HQ_PIPELINES = [
  'chamber' => [
    'label' => 'Chambers',
    'stages' => ['new' => 'New', 'contacted' => 'Contacted', 'demo_booked' => 'Demo booked', 'demo_done' => 'Demo done', 'proposal' => 'Proposal', 'sponsor_search' => 'Sponsor search', 'won' => 'Won', 'lost' => 'Lost'],
  ],
  'sponsor' => [
    'label' => 'Sponsors',
    'stages' => ['new' => 'New', 'contacted' => 'Contacted', 'pitched' => 'Pitched', 'verbal_yes' => 'Verbal yes', 'won' => 'Won', 'lost' => 'Lost'],
  ],
];

const HQ_ORG_KINDS = ['prospect' => 'Prospect chamber', 'chamber' => 'Chamber (customer)', 'sponsor' => 'Sponsor business', 'partner' => 'Partner', 'other' => 'Other'];

const HQ_ACTIVITY_KINDS = ['note' => 'Note', 'call' => 'Call', 'email' => 'Email', 'meeting' => 'Meeting', 'demo' => 'Demo', 'system' => 'System'];

const HQ_DOC_FOLDERS = ['General', 'New chamber setup', 'Base44', 'Cloudflare', 'Inbound email', 'Amazon SES', 'Hostinger and PWAs', 'Stripe', 'OpenAI', 'Troubleshooting'];

/** Hours between automatic connector checks (Leon, Nov 20: every 4 hours, plus refresh on demand). */
const HQ_REFRESH_HOURS = 4;

// ---------------- small helpers ----------------

function post_str(string $k, int $max = 255): ?string {
  $v = trim((string) ($_POST[$k] ?? ''));
  return $v === '' ? null : mb_substr($v, 0, $max);
}

function post_int(string $k): ?int {
  $v = trim((string) ($_POST[$k] ?? ''));
  return $v === '' || !is_numeric($v) ? null : (int) $v;
}

function post_money(string $k): ?float {
  $v = preg_replace('/[^0-9.]/', '', (string) ($_POST[$k] ?? ''));
  return $v === '' ? null : round((float) $v, 2);
}

function post_date(string $k): ?string {
  $v = trim((string) ($_POST[$k] ?? ''));
  return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
}

function post_url(string $k): ?string {
  $v = trim((string) ($_POST[$k] ?? ''));
  if ($v === '') return null;
  if (!preg_match('#^https?://#i', $v)) $v = 'https://' . $v;
  return filter_var($v, FILTER_VALIDATE_URL) ? rtrim(mb_substr($v, 0, 255), '/') : null;
}

function row(string $table, int $id): ?array {
  if (!isset(DASH_TABLES[$table])) throw new InvalidArgumentException('Unknown table');
  $st = db()->prepare("SELECT * FROM `$table` WHERE id = ?");
  $st->execute([$id]);
  return $st->fetch() ?: null;
}

function rows(string $sql, array $args = []): array {
  $st = db()->prepare($sql);
  $st->execute($args);
  return $st->fetchAll();
}

function money($v): string {
  if ($v === null || $v === '') return '—';
  $f = (float) $v;
  return '$' . (fmod($f, 1.0) == 0.0 ? number_format($f) : number_format($f, 2));
}

function badge(string $text, string $kind = 'gray'): string {
  return '<span class="badge ' . h($kind) . '">' . h($text) . '</span>';
}

function due_label(?string $date): string {
  if (!$date) return '';
  $today = gmdate('Y-m-d');
  if ($date < $today) return badge('overdue ' . date('M j', strtotime($date)), 'err');
  if ($date === $today) return badge('due today', 'warn');
  return '<span class="muted small">due ' . h(date('M j', strtotime($date))) . '</span>';
}

function add_activity(array $links, string $kind, string $body): void {
  db()->prepare('INSERT INTO activities (org_id, contact_id, deal_id, chamber_id, kind, body, who, created_at) VALUES (?,?,?,?,?,?,?,?)')->execute([
    $links['org_id'] ?? null, $links['contact_id'] ?? null, $links['deal_id'] ?? null, $links['chamber_id'] ?? null,
    isset(HQ_ACTIVITY_KINDS[$kind]) ? $kind : 'note', mb_substr($body, 0, 20000), current_user()['email'] ?? 'system', now(),
  ]);
}

/** Find an organization by exact name (case-insensitive) or create it. */
function org_find_or_create(string $name, string $kind = 'prospect', array $extra = []): int {
  $st = db()->prepare('SELECT id FROM orgs WHERE LOWER(name) = LOWER(?) LIMIT 1');
  $st->execute([$name]);
  $id = $st->fetchColumn();
  if ($id) return (int) $id;
  db()->prepare('INSERT INTO orgs (name, kind, town, state, website, member_count, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')->execute([
    mb_substr($name, 0, 190), $kind, $extra['town'] ?? null, $extra['state'] ?? null, $extra['website'] ?? null, $extra['member_count'] ?? null, now(), now(),
  ]);
  return (int) db()->lastInsertId();
}

/** Find a contact by email, or create one. */
function contact_find_or_create(?int $orgId, string $name, ?string $email, ?string $phone = null, ?string $title = null): int {
  if ($email) {
    $st = db()->prepare('SELECT id FROM contacts WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $st->execute([$email]);
    $id = $st->fetchColumn();
    if ($id) return (int) $id;
  }
  db()->prepare('INSERT INTO contacts (org_id, name, title, email, phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    ->execute([$orgId, mb_substr($name, 0, 190), $title, $email, $phone, now(), now()]);
  return (int) db()->lastInsertId();
}

// ---------------- chambers & the HQ connector ----------------

function all_chambers(): array {
  return db()->query("SELECT c.*, s.name AS sponsor_name, a.name AS pwa_name, a.url AS pwa_url
    FROM chambers c LEFT JOIN orgs s ON s.id = c.sponsor_org_id LEFT JOIN apps a ON a.id = c.app_id
    ORDER BY FIELD(c.plan, 'demo') ASC, c.name")->fetchAll();
}

function chamber_snapshot(array $c): array {
  return $c['snapshot_json'] ? (json_decode($c['snapshot_json'], true) ?: []) : [];
}

/**
 * Ask a chamber's HQ connector (a backend function in its Base44 app) for a status snapshot.
 * Contract: docs/HQ.md. Saves the result (or the error) on the chamber row.
 */
function refresh_chamber(array $c): array {
  if (!$c['connector_url']) return ['ok' => false, 'error' => 'No connector set up yet'];
  $key = unseal($c['connector_key']);
  if (!$key) return ['ok' => false, 'error' => 'No connector key saved'];
  [$status, $text] = http('POST', $c['connector_url'], ['Content-Type: application/json', 'Accept: application/json', 'X-HQ-Key: ' . $key], json_encode(['action' => 'snapshot']), 20);
  $json = json_decode($text, true);
  if ($status >= 200 && $status < 300 && is_array($json) && ($json['ok'] ?? false)) {
    db()->prepare('UPDATE chambers SET snapshot_json = ?, snapshot_at = ?, snapshot_error = NULL WHERE id = ?')
      ->execute([json_encode($json, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), now(), $c['id']]);
    return ['ok' => true, 'data' => $json];
  }
  $err = $status === 0 ? 'Could not reach it: ' . $text : (is_array($json) && !empty($json['error']) ? (string) $json['error'] : "Answered with HTTP $status");
  db()->prepare('UPDATE chambers SET snapshot_error = ?, snapshot_at = ? WHERE id = ?')->execute([mb_substr($err, 0, 500), now(), $c['id']]);
  return ['ok' => false, 'error' => $err];
}

/** Things on a chamber that need attention: list of [text, kind]. */
function chamber_flags(array $c): array {
  $f = [];
  $s = chamber_snapshot($c);
  $n = $s['counts'] ?? [];
  if ($c['status'] === 'grace') {
    $days = $c['grace_ends'] ? (int) floor((strtotime($c['grace_ends']) - time()) / 86400) : null;
    $f[] = [$days === null ? 'Sponsor grace period' : ($days >= 0 ? "Sponsor grace: $days days left" : 'Sponsor grace period ended'), 'warn'];
  }
  if ($c['connector_url'] && $c['snapshot_error']) $f[] = ['Connector: ' . $c['snapshot_error'], 'err'];
  if (!$c['connector_url'] && $c['plan'] !== 'demo') $f[] = ['Connector not set up', 'gray'];
  if (!empty($n['open_tickets'])) $f[] = [$n['open_tickets'] . ' open ticket' . ($n['open_tickets'] == 1 ? '' : 's'), 'warn'];
  if (!empty($n['pending_approvals'])) $f[] = [$n['pending_approvals'] . ' waiting for approval', 'blue'];
  $h = $s['health'] ?? [];
  if (($h['inbound_email'] ?? '') === 'error') $f[] = ['Inbound email broken', 'err'];
  if (!empty($h['scheduled_jobs_last_run']) && strtotime($h['scheduled_jobs_last_run']) < time() - 86400) $f[] = ['Scheduled jobs not run in 24 hr', 'err'];
  foreach ((array) ($s['flags'] ?? []) as $extra) {
    if (is_string($extra) && $extra !== '') $f[] = [mb_substr($extra, 0, 120), 'warn'];
  }
  return $f;
}

function base44_editor_url(?string $appId): ?string {
  return $appId && preg_match('/^[a-f0-9]{24}$/i', $appId) ? 'https://app.base44.com/apps/' . $appId : null;
}

// ---------------- docs: Markdown (a safe subset) ----------------

/** Render a small, safe subset of Markdown: headings, lists, code, quotes, links, bold, italic, inline code. */
function md(string $src): string {
  $lines = preg_split('/\r\n|\r|\n/', $src);
  $out = '';
  $list = null;
  $para = [];
  $inCode = false;
  $code = [];
  $flushPara = function () use (&$para, &$out) {
    if ($para) $out .= '<p>' . md_inline(implode(' ', $para)) . "</p>\n";
    $para = [];
  };
  $closeList = function () use (&$list, &$out) {
    if ($list) $out .= "</$list>\n";
    $list = null;
  };
  foreach ($lines as $line) {
    if ($inCode) {
      if (preg_match('/^```/', $line)) {
        $out .= '<pre><code>' . h(implode("\n", $code)) . "</code></pre>\n";
        $inCode = false;
        $code = [];
      } else {
        $code[] = $line;
      }
      continue;
    }
    if (preg_match('/^```/', $line)) { $flushPara(); $closeList(); $inCode = true; continue; }
    if (trim($line) === '') { $flushPara(); $closeList(); continue; }
    if (preg_match('/^(#{1,4})\s+(.*)$/', $line, $m)) {
      $flushPara(); $closeList();
      $lvl = min(4, strlen($m[1]) + 1);
      $out .= "<h$lvl>" . md_inline($m[2]) . "</h$lvl>\n";
      continue;
    }
    if (preg_match('/^\s*[-*]\s+(?:\[( |x|X)\]\s+)?(.*)$/', $line, $m)) {
      $flushPara();
      if ($list !== 'ul') { $closeList(); $out .= "<ul>\n"; $list = 'ul'; }
      $box = $m[1] !== '' ? (strtolower($m[1]) === 'x' ? '☑ ' : '☐ ') : '';
      $out .= '<li>' . $box . md_inline($m[2]) . "</li>\n";
      continue;
    }
    if (preg_match('/^\s*\d+[.)]\s+(.*)$/', $line, $m)) {
      $flushPara();
      if ($list !== 'ol') { $closeList(); $out .= "<ol>\n"; $list = 'ol'; }
      $out .= '<li>' . md_inline($m[1]) . "</li>\n";
      continue;
    }
    if (preg_match('/^>\s?(.*)$/', $line, $m)) {
      $flushPara(); $closeList();
      $out .= '<blockquote>' . md_inline($m[1]) . "</blockquote>\n";
      continue;
    }
    $closeList();
    $para[] = trim($line);
  }
  if ($inCode) $out .= '<pre><code>' . h(implode("\n", $code)) . "</code></pre>\n";
  $flushPara();
  $closeList();
  return $out;
}

function md_inline(string $t): string {
  $codes = [];
  $t = preg_replace_callback('/`([^`]+)`/', function ($m) use (&$codes) {
    $codes[] = '<code>' . h($m[1]) . '</code>';
    return "\x01" . (count($codes) - 1) . "\x01";
  }, $t);
  $t = h($t);
  $t = preg_replace_callback('/\[([^\]]+)\]\((https?:\/\/[^\s)]+|index\.php\?[^\s)]+)\)/', function ($m) {
    $url = html_entity_decode($m[2], ENT_QUOTES);
    $ext = str_starts_with($url, 'http');
    return '<a href="' . h($url) . '"' . ($ext ? ' target="_blank" rel="noopener"' : '') . '>' . $m[1] . '</a>';
  }, $t);
  $t = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $t);
  $t = preg_replace('/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)/', '<em>$1</em>', $t);
  return preg_replace_callback("/\x01(\d+)\x01/", fn($m) => $codes[(int) $m[1]], $t);
}

// ---------------- Ask HQ ----------------

/** Pick the docs most likely to answer a question (MySQL full-text, then a plain LIKE fallback). */
function search_docs(string $q, int $limit = 6): array {
  $q = trim($q);
  if ($q === '') return [];
  $found = [];
  try {
    $found = rows('SELECT id, folder, title, body, MATCH(title, body, tags) AGAINST (?) AS score FROM docs
      WHERE MATCH(title, body, tags) AGAINST (?) ORDER BY score DESC LIMIT ' . (int) $limit, [$q, $q]);
  } catch (Throwable $e) {
    $found = [];
  }
  if (!$found) {
    $words = array_values(array_filter(preg_split('/\W+/u', mb_strtolower($q)), fn($w) => mb_strlen($w) >= 4));
    $words = array_slice($words, 0, 6);
    if ($words) {
      $where = implode(' OR ', array_fill(0, count($words), '(LOWER(title) LIKE ? OR LOWER(body) LIKE ? OR LOWER(tags) LIKE ?)'));
      $args = [];
      foreach ($words as $w) array_push($args, "%$w%", "%$w%", "%$w%");
      $found = rows("SELECT id, folder, title, body FROM docs WHERE $where ORDER BY updated_at DESC LIMIT " . (int) $limit, $args);
    }
  }
  return $found;
}

/**
 * Answer a question from the docs library with OpenAI. Returns [answer, docs used].
 * The model sees only the matching docs and is told to say so when they don't cover the question.
 */
function ask_hq(string $question): array {
  $key = unseal(setting('openai_api_key'));
  if (!$key) throw new RuntimeException('Add your OpenAI API key in Settings first.');
  $docs = search_docs($question);
  if (!$docs) return ["I couldn't find anything about that in your docs yet. Add a doc for it, and I'll be able to answer next time.", []];
  $context = '';
  foreach ($docs as $d) {
    $context .= "\n\n=== DOC #{$d['id']}: {$d['title']} (folder: {$d['folder']}) ===\n" . mb_substr($d['body'], 0, 6000);
    if (mb_strlen($context) > 24000) break;
  }
  $model = setting('openai_model') ?: 'gpt-4o-mini';
  $messages = [
    ['role' => 'system', 'content' => "You are Ask HQ, the private help assistant for Chamber Loop's admin. Answer ONLY from the docs provided. Give clear numbered steps when the question is a how-to. After each fact, cite the doc like [#12]. If the docs don't cover the question, say so plainly and suggest which doc to write. Never invent settings, URLs, keys or prices. Keep it concise."],
    ['role' => 'user', 'content' => "Docs:$context\n\nQuestion: $question"],
  ];
  $body = ['model' => $model, 'messages' => $messages];
  if (!preg_match('/^(gpt-5|o\d)/i', $model)) $body['temperature'] = 0.2;
  [$status, $text] = http('POST', 'https://api.openai.com/v1/chat/completions', [
    'Authorization: Bearer ' . $key, 'Content-Type: application/json',
  ], json_encode($body), 60);
  $json = json_decode($text, true);
  if ($status !== 200 || !is_array($json)) {
    $msg = is_array($json) ? ($json['error']['message'] ?? null) : null;
    throw new RuntimeException('OpenAI: ' . ($msg ?: ($status === 0 ? $text : "HTTP $status")));
  }
  $answer = trim((string) ($json['choices'][0]['message']['content'] ?? ''));
  return [$answer !== '' ? $answer : 'No answer came back. Try asking another way.', $docs];
}

// ---------------- lead webhook ----------------

function lead_hook_secret(): string {
  $s = unseal(setting('lead_hook_secret'));
  if (!$s) {
    $s = bin2hex(random_bytes(20));
    set_setting('lead_hook_secret', seal($s));
  }
  return $s;
}

/** Create org + contact + deal + note from a lead (website demo request, contact form, NotiQ…). */
function create_lead(array $in, string $defaultSource = 'website'): int {
  $orgName = trim((string) ($in['organization'] ?? $in['org'] ?? $in['company'] ?? ''));
  $name = trim((string) ($in['name'] ?? ''));
  $email = strtolower(trim((string) ($in['email'] ?? '')));
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $email = '';
  if ($name === '' && $orgName === '') $name = $email;
  if ($orgName === '' && $name === '') throw new InvalidArgumentException('A lead needs a name, email or organization.');
  $pipeline = ($in['pipeline'] ?? '') === 'sponsor' ? 'sponsor' : 'chamber';
  $orgId = $orgName !== '' ? org_find_or_create($orgName, $pipeline === 'sponsor' ? 'sponsor' : 'prospect', [
    'town' => isset($in['town']) ? mb_substr((string) $in['town'], 0, 120) : null,
    'member_count' => isset($in['member_count']) && is_numeric(preg_replace('/\D/', '', (string) $in['member_count'])) ? (int) preg_replace('/\D/', '', (string) $in['member_count']) : null,
  ]) : null;
  $contactId = $name !== '' || $email !== '' ? contact_find_or_create($orgId, $name !== '' ? $name : $email, $email ?: null, isset($in['phone']) ? mb_substr((string) $in['phone'], 0, 60) : null, isset($in['role']) ? mb_substr((string) $in['role'], 0, 120) : null) : null;
  $source = mb_substr(trim((string) ($in['source'] ?? $defaultSource)) ?: $defaultSource, 0, 60);
  db()->prepare('INSERT INTO deals (org_id, contact_id, pipeline, title, stage, source, next_step, next_due, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute([
    $orgId, $contactId, $pipeline, mb_substr($orgName !== '' ? $orgName : $name, 0, 190), 'new', $source, 'Reply to the new lead', gmdate('Y-m-d', time() + 86400), now(), now(),
  ]);
  $dealId = (int) db()->lastInsertId();
  $lines = [];
  foreach (['role' => 'Role', 'phone' => 'Phone', 'member_count' => 'Members', 'interests' => 'Interested in', 'topic' => 'Topic', 'notes' => 'Notes', 'message' => 'Message'] as $k => $label) {
    if (!isset($in[$k]) || $in[$k] === '' || $in[$k] === []) continue;
    $v = is_array($in[$k]) ? implode(', ', array_map('strval', $in[$k])) : (string) $in[$k];
    $lines[] = "$label: " . mb_substr($v, 0, 4000);
  }
  add_activity(['org_id' => $orgId, 'contact_id' => $contactId, 'deal_id' => $dealId], 'system', "New lead from $source." . ($lines ? "\n" . implode("\n", $lines) : ''));
  return $dealId;
}
