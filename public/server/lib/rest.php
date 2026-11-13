<?php
/**
 * /api/rest — table reads and writes for the app screens and for the dashboard API.
 *
 * Request body (JSON):
 *   table, action (select|insert|update|delete|upsert), columns ("*" or "a, b"),
 *   filters [[column, op, value]...] with op in eq neq gt gte lt lte like ilike is in not_eq not_in not_is,
 *   order [[column, ascending]...], limit, offset, mode (many|single|maybe), count ("exact"), head,
 *   values (object or array of objects), returning (bool), on_conflict.
 *
 * Every table has a rule below saying who may read and who may write. These rules are the
 * same ones the old Supabase database enforced.
 */

declare(strict_types=1);

/**
 * read:  minimum role to read every row
 * public_read: optional [where-filter callable, allowed columns|null] used when the caller is below `read`
 * write / insert / delete: minimum role for those actions
 * hidden: columns only `write`-level callers can see
 */
function table_rules(): array {
  $visible = fn() => [['is_visible', 'eq', true]];
  return [
    'app_settings' => ['read' => 'anon', 'write' => 'editor', 'insert' => 'owner', 'delete' => 'owner'],
    'apps' => ['read' => 'anon', 'write' => 'editor', 'insert' => 'owner', 'delete' => 'owner', 'hidden' => ['smtp_password', 'access_password']],
    'app_features' => ['read' => 'anon', 'write' => 'editor'],
    'feature_links' => ['read' => 'anon', 'write' => 'editor'],
    'feature_rss_feeds' => ['read' => 'anon', 'write' => 'editor'],
    'feature_custom_pages' => ['read' => 'anon', 'write' => 'editor'],
    'app_users' => ['read' => 'sender', 'write' => 'owner'],
    'app_analytics' => ['read' => 'sender', 'write' => 'owner'],
    'app_collaborators' => ['read' => 'editor', 'write' => 'owner'],
    'push_notifications' => [
      'read' => 'sender', 'write' => 'sender',
      // Visitors see notifications that were actually sent (the "Latest from the Chamber" card).
      'public_read' => [fn() => [['status', 'eq', 'sent']], ['id', 'app_id', 'title', 'body', 'url', 'sent_at', 'icon_url', 'created_at', 'status']],
    ],
    'profiles' => ['read' => 'owner', 'write' => 'owner', 'insert' => 'owner', 'delete' => 'owner'],
    'home_sections' => ['read' => 'editor', 'write' => 'editor', 'public_read' => [$visible, null]],
    'home_section_items' => ['read' => 'editor', 'write' => 'editor', 'public_read' => [$visible, null]],
    'home_banner_slides' => ['read' => 'editor', 'write' => 'editor', 'public_read' => [$visible, [
      'id', 'section_id', 'position', 'is_visible', 'image_url', 'image_url_es', 'alt_text', 'alt_text_es',
      'link_type', 'link_value', 'open_mode', 'start_at', 'end_at', 'sponsor_name',
    ]]],
    'home_gallery_photos' => ['read' => 'editor', 'write' => 'editor', 'public_read' => [$visible, null]],
    'home_image_cleanup' => ['read' => 'editor', 'write' => 'editor'],
  ];
}

/** Tables that record who last changed a row (shown as "Updated by ..." in the editor). */
const TRACK_UPDATED_BY = ['home_sections', 'home_section_items', 'home_banner_slides', 'home_gallery_photos'];

function rest_route(): void {
  $b = json_body();
  $table = (string) ($b['table'] ?? '');
  $action = (string) ($b['action'] ?? 'select');
  if (!in_array($table, PUBLIC_TABLES, true)) throw new ApiException("Unknown table: $table", 404);
  $rules = table_rules()[$table];
  $cols = SCHEMA[$table];

  $filters = rest_filters($table, $b['filters'] ?? []);

  if ($action === 'select') {
    $result = rest_select($table, $rules, $b, $filters);
    json_out($result);
  }

  // ---- writes ----
  $a = actor();
  if ($table === 'profiles' && in_array($action, ['update'], true) && $a['id'] && !role_at_least('owner')) {
    // Anyone signed in may change their own display name, nothing else.
    $vals = is_array($b['values'] ?? null) ? $b['values'] : [];
    if (array_diff(array_keys($vals), ['full_name']) || !rest_filters_target_self($filters, $a['id'])) {
      throw new ApiException('Only an owner can change team roles', 403);
    }
    $rules['write'] = 'none';
  }
  $need = $rules[$action === 'upsert' ? 'insert' : $action] ?? $rules['write'];
  if ($action === 'upsert') $need = ROLE_RANK[$need] > ROLE_RANK[$rules['write']] ? $need : $rules['write'];
  require_role($need, 'You do not have permission to change this.');

  switch ($action) {
    case 'insert':
    case 'upsert':
      $rows = rest_insert($table, $b['values'] ?? [], $action === 'upsert', (string) ($b['on_conflict'] ?? 'id'));
      break;
    case 'update':
      if (!$filters) throw new ApiException('Update needs a filter', 400);
      $rows = rest_update($table, $b['values'] ?? [], $filters);
      break;
    case 'delete':
      if (!$filters) throw new ApiException('Delete needs a filter', 400);
      $rows = rest_delete($table, $filters);
      break;
    default:
      throw new ApiException('Unknown action', 400);
  }

  if (empty($b['returning'])) json_out(['data' => null, 'count' => count($rows)]);
  $rows = array_map(fn($r) => rest_project($table, $r, rest_columns($table, (string) ($b['columns'] ?? '*'))), $rows);
  json_out(rest_shape($rows, (string) ($b['mode'] ?? 'many'), null));
}

function rest_filters_target_self(array $filters, string $id): bool {
  foreach ($filters as [$c, $op, $v]) if ($c === 'id' && $op === 'eq' && $v === $id) return true;
  return false;
}

function rest_columns(string $table, string $spec): array {
  $spec = trim($spec);
  if ($spec === '' || $spec === '*') return array_keys(SCHEMA[$table]);
  $out = [];
  foreach (explode(',', $spec) as $c) {
    $c = trim($c);
    if ($c === '') continue;
    if (!isset(SCHEMA[$table][$c])) throw new ApiException("Unknown column $table.$c", 400);
    $out[] = $c;
  }
  return $out;
}

function rest_filters(string $table, $raw): array {
  if (!is_array($raw)) return [];
  $ops = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'not_eq', 'not_in', 'not_is'];
  $out = [];
  foreach ($raw as $f) {
    if (!is_array($f) || count($f) < 3) throw new ApiException('Bad filter', 400);
    [$c, $op, $v] = $f;
    if (!isset(SCHEMA[$table][$c])) throw new ApiException("Unknown column $table.$c", 400);
    if (!in_array($op, $ops, true)) throw new ApiException("Unsupported filter $op", 400);
    $out[] = [$c, $op, $v];
  }
  return $out;
}

/** Turn filters into SQL. */
function rest_where(string $table, array $filters, array &$params): string {
  $parts = [];
  foreach ($filters as [$c, $op, $v]) {
    $type = SCHEMA[$table][$c][0];
    $col = "`$c`";
    $neg = str_starts_with($op, 'not_');
    $base = $neg ? substr($op, 4) : $op;
    switch ($base) {
      case 'is':
        $sql = $v === null || $v === 'null' ? "$col IS NULL" : ($v === true || $v === 'true' ? "$col = 1" : "$col = 0");
        break;
      case 'in':
        $list = is_array($v) ? array_values($v) : [];
        if (!$list) {
          $sql = '1=0';
          break;
        }
        $ph = [];
        foreach ($list as $item) {
          $ph[] = '?';
          $params[] = rest_to_db($type, $item);
        }
        $sql = "$col IN (" . implode(',', $ph) . ')';
        break;
      case 'like':
      case 'ilike':
        $sql = $base === 'ilike' ? "LOWER($col) LIKE LOWER(?)" : "$col LIKE BINARY ?";
        $params[] = (string) $v;
        break;
      default:
        $map = ['eq' => '=', 'neq' => '<>', 'gt' => '>', 'gte' => '>=', 'lt' => '<', 'lte' => '<='];
        if ($v === null) {
          $sql = $base === 'neq' ? "$col IS NOT NULL" : "$col IS NULL";
          break;
        }
        $sql = "$col {$map[$base]} ?";
        $params[] = rest_to_db($type, $v);
        if ($base === 'neq') $sql = "($sql OR $col IS NULL)";
    }
    $parts[] = $neg ? "NOT ($sql)" : $sql;
  }
  return $parts ? ' WHERE ' . implode(' AND ', $parts) : '';
}

function rest_select(string $table, array $rules, array $b, array $filters): array {
  $columns = rest_columns($table, (string) ($b['columns'] ?? '*'));
  $allowedCols = null;
  // Special: anyone may count profiles (the sign-in page checks whether an owner exists yet).
  if ($table === 'profiles' && !empty($b['head']) && !empty($b['count'])) {
    $n = (int) db()->query('SELECT COUNT(*) FROM profiles')->fetchColumn();
    return ['data' => null, 'count' => $n];
  }
  // Signed-in users may read their own profile.
  if ($table === 'profiles' && !role_at_least('owner')) {
    $me = actor()['id'];
    if (!$me) return rest_shape([], (string) ($b['mode'] ?? 'many'), null);
    $filters[] = ['id', 'eq', $me];
  }
  if (!role_at_least($rules['read']) && $table !== 'profiles') {
    if (empty($rules['public_read'])) {
      // Same as row-level security: you simply see no rows.
      return rest_shape([], (string) ($b['mode'] ?? 'many'), !empty($b['count']) ? 0 : null);
    }
    [$extra, $allowedCols] = $rules['public_read'];
    $filters = array_merge($filters, $extra());
    if ($allowedCols) {
      $bad = array_diff($columns, $allowedCols);
      $spec = trim((string) ($b['columns'] ?? '*'));
      if ($spec === '*' || $spec === '') $columns = $allowedCols;
      elseif ($bad) throw new ApiException('permission denied for column ' . reset($bad), 403);
    }
  }

  $params = [];
  $where = rest_where($table, $filters, $params);
  $count = null;
  if (!empty($b['count'])) {
    $st = db()->prepare("SELECT COUNT(*) FROM `$table`$where");
    $st->execute($params);
    $count = (int) $st->fetchColumn();
    if (!empty($b['head'])) return ['data' => null, 'count' => $count];
  }

  $order = '';
  if (!empty($b['order']) && is_array($b['order'])) {
    $parts = [];
    foreach ($b['order'] as $o) {
      [$c, $asc] = [$o[0] ?? '', $o[1] ?? true];
      if (!isset(SCHEMA[$table][$c])) throw new ApiException("Unknown column $table.$c", 400);
      // Postgres puts NULLs last when ascending, first when descending.
      $parts[] = $asc ? "`$c` IS NULL, `$c` ASC" : "`$c` IS NOT NULL, `$c` DESC";
    }
    $order = ' ORDER BY ' . implode(', ', $parts);
  }
  $limit = '';
  $max = 1000;
  $n = isset($b['limit']) && $b['limit'] !== null ? min((int) $b['limit'], $max) : $max;
  $off = isset($b['offset']) && $b['offset'] !== null ? max(0, (int) $b['offset']) : 0;
  $limit = " LIMIT $n OFFSET $off";

  $sel = implode(', ', array_map(fn($c) => "`$c`", $columns));
  $st = db()->prepare("SELECT $sel FROM `$table`$where$order$limit");
  $st->execute($params);
  $hide = role_at_least($rules['write']) ? [] : ($rules['hidden'] ?? []);
  $rows = [];
  foreach ($st->fetchAll() as $r) {
    $row = rest_project($table, $r, $columns);
    foreach ($hide as $h) if (array_key_exists($h, $row)) $row[$h] = null;
    $rows[] = $row;
  }
  return rest_shape($rows, (string) ($b['mode'] ?? 'many'), $count);
}

function rest_shape(array $rows, string $mode, ?int $count): array {
  if ($mode === 'single') {
    if (count($rows) !== 1) {
      json_out(['data' => null, 'error' => ['message' => 'JSON object requested, multiple (or no) rows returned', 'code' => 'PGRST116']], 406);
    }
    return ['data' => $rows[0], 'count' => $count];
  }
  if ($mode === 'maybe') {
    if (count($rows) > 1) json_out(['data' => null, 'error' => ['message' => 'Multiple rows returned', 'code' => 'PGRST116']], 406);
    return ['data' => $rows[0] ?? null, 'count' => $count];
  }
  return ['data' => $rows, 'count' => $count];
}

// ---------------- value conversion ----------------

function rest_to_db(string $type, $v) {
  if ($v === null) return null;
  switch ($type) {
    case 'bool': return ($v === true || $v === 1 || $v === '1' || $v === 'true') ? 1 : 0;
    case 'int': return is_numeric($v) ? (int) $v : null;
    case 'json':
    case 'array': return json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    case 'ts': return to_sql_ts($v);
    case 'date': return substr((string) $v, 0, 10);
    case 'uuid':
      if (!is_uuid($v)) throw new ApiException('invalid input syntax for type uuid: "' . (is_scalar($v) ? $v : '') . '"', 400);
      return strtolower((string) $v);
    default: return is_scalar($v) ? (string) $v : json_encode($v);
  }
}

function rest_from_db(string $type, $v) {
  if ($v === null) return null;
  switch ($type) {
    case 'bool': return (bool) (int) $v;
    case 'int': return (int) $v;
    case 'json':
    case 'array':
      $d = json_decode((string) $v, true);
      return $d;
    case 'ts': return from_sql_ts((string) $v);
    default: return $v;
  }
}

function rest_project(string $table, array $row, array $columns): array {
  $out = [];
  foreach ($columns as $c) {
    if (!array_key_exists($c, $row)) continue;
    $out[$c] = rest_from_db(SCHEMA[$table][$c][0], $row[$c]);
  }
  // JSON objects must stay objects ({}), not become [] after decoding.
  foreach ($out as $c => $v) {
    if (SCHEMA[$table][$c][0] === 'json' && is_array($v) && $v === []) $out[$c] = new stdClass();
  }
  return $out;
}

function rest_default($spec) {
  [$type, $def] = $spec;
  if ($def === 'uuid') return uuid4();
  if ($type === 'ts' && is_string($def)) return $def === 'now' ? now_sql() : now_sql($def);
  if ($type === 'date' && $def === 'today') return gmdate('Y-m-d');
  if ($def === null) return null;
  return rest_to_db($type, $def);
}

function fetch_rows(string $table, array $ids): array {
  if (!$ids) return [];
  $ph = implode(',', array_fill(0, count($ids), '?'));
  $st = db()->prepare("SELECT * FROM `$table` WHERE id IN ($ph)");
  $st->execute(array_values($ids));
  $byId = [];
  foreach ($st->fetchAll() as $r) $byId[$r['id']] = $r;
  return array_values(array_filter(array_map(fn($id) => $byId[$id] ?? null, $ids)));
}

function rest_insert(string $table, $values, bool $upsert, string $onConflict): array {
  if (!is_array($values)) throw new ApiException('Nothing to insert', 400);
  $list = array_is_list($values) ? $values : [$values];
  $a = actor();
  $ids = [];
  db()->beginTransaction();
  try {
    foreach ($list as $vals) {
      if (!is_array($vals)) throw new ApiException('Bad row', 400);
      $row = [];
      foreach (SCHEMA[$table] as $c => $spec) {
        if (array_key_exists($c, $vals)) {
          $row[$c] = rest_to_db($spec[0], $vals[$c]);
          if ($row[$c] === null && !$spec[2]) $row[$c] = rest_default($spec);
        } else {
          $row[$c] = rest_default($spec);
        }
        if ($row[$c] === null && !$spec[2]) throw new ApiException("null value in column \"$c\" violates not-null constraint", 400);
      }
      foreach (array_keys($vals) as $k) if (!isset(SCHEMA[$table][$k])) throw new ApiException("Unknown column $table.$k", 400);
      if (in_array($table, TRACK_UPDATED_BY, true) && $a['id']) {
        $row['updated_by'] = $a['id'];
        $row['updated_by_name'] = $a['name'] ?: 'A team member';
      }
      if ($table === 'profiles') $row['is_owner'] = $row['role'] === 'owner' ? 1 : 0;

      $cols = array_keys($row);
      $sql = "INSERT INTO `$table` (" . implode(',', array_map(fn($c) => "`$c`", $cols)) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')';
      if ($upsert) {
        $conf = array_map('trim', explode(',', $onConflict));
        $upd = array_filter($cols, fn($c) => !in_array($c, $conf, true) && $c !== 'id' && $c !== 'created_at' && array_key_exists($c, $vals));
        if ($upd) $sql .= ' ON DUPLICATE KEY UPDATE ' . implode(', ', array_map(fn($c) => "`$c` = VALUES(`$c`)", $upd));
        else $sql = str_replace('INSERT INTO', 'INSERT IGNORE INTO', $sql);
        if ($conf !== ['id']) {
          // Find an existing row by the conflict columns so we return/update the right id.
          $w = implode(' AND ', array_map(fn($c) => "`$c` = ?", $conf));
          $st = db()->prepare("SELECT id FROM `$table` WHERE $w");
          $st->execute(array_map(fn($c) => $row[$c], $conf));
          $existing = $st->fetchColumn();
          if ($existing) {
            $row['id'] = $existing;
          }
        }
      }
      db()->prepare($sql)->execute(array_values($row));
      $ids[] = $row['id'];
    }
    db()->commit();
  } catch (Throwable $e) {
    db()->rollBack();
    if ($e instanceof PDOException && $e->getCode() === '23000') throw new ApiException('duplicate key value violates unique constraint', 409);
    throw $e;
  }
  return fetch_rows($table, $ids);
}

function rest_update(string $table, $values, array $filters): array {
  if (!is_array($values) || array_is_list($values)) throw new ApiException('Nothing to update', 400);
  $a = actor();
  $set = [];
  $params = [];
  foreach ($values as $c => $v) {
    if (!isset(SCHEMA[$table][$c])) throw new ApiException("Unknown column $table.$c", 400);
    if ($c === 'id') continue;
    $spec = SCHEMA[$table][$c];
    $dbv = rest_to_db($spec[0], $v);
    if ($dbv === null && !$spec[2]) throw new ApiException("null value in column \"$c\" violates not-null constraint", 400);
    $set[$c] = $dbv;
  }
  if (isset(SCHEMA[$table]['updated_at'])) $set['updated_at'] = now_sql();
  if (in_array($table, TRACK_UPDATED_BY, true) && $a['id']) {
    $set['updated_by'] = $a['id'];
    $set['updated_by_name'] = $a['name'] ?: 'A team member';
  }
  if ($table === 'profiles' && array_key_exists('role', $set)) $set['is_owner'] = $set['role'] === 'owner' ? 1 : 0;

  $wp = [];
  $where = rest_where($table, $filters, $wp);
  $st = db()->prepare("SELECT * FROM `$table`$where LIMIT 5000");
  $st->execute($wp);
  $before = $st->fetchAll();
  if (!$before || !$set) return $before;

  $sql = "UPDATE `$table` SET " . implode(', ', array_map(fn($c) => "`$c` = ?", array_keys($set))) . $where;
  db()->prepare($sql)->execute(array_merge(array_values($set), $wp));
  $after = fetch_rows($table, array_column($before, 'id'));
  queue_removed_images($table, $before, $after);
  return $after;
}

function rest_delete(string $table, array $filters): array {
  $wp = [];
  $where = rest_where($table, $filters, $wp);
  $st = db()->prepare("SELECT * FROM `$table`$where LIMIT 5000");
  $st->execute($wp);
  $before = $st->fetchAll();
  if (!$before) return [];
  $ids = array_column($before, 'id');
  $ph = implode(',', array_fill(0, count($ids), '?'));
  db()->prepare("DELETE FROM `$table` WHERE id IN ($ph)")->execute($ids);
  // Child rows go with their section (the old database did this with ON DELETE CASCADE).
  if ($table === 'home_sections') {
    $rows = [];
    foreach (['home_section_items', 'home_banner_slides', 'home_gallery_photos'] as $child) {
      $s = db()->prepare("SELECT * FROM `$child` WHERE section_id IN ($ph)");
      $s->execute($ids);
      $kids = $s->fetchAll();
      db()->prepare("DELETE FROM `$child` WHERE section_id IN ($ph)")->execute($ids);
      queue_removed_images($child, $kids, []);
    }
  }
  if ($table === 'app_features') {
    foreach (['feature_links', 'feature_rss_feeds', 'feature_custom_pages'] as $child) {
      db()->prepare("DELETE FROM `$child` WHERE feature_id IN ($ph)")->execute($ids);
    }
  }
  queue_removed_images($table, $before, []);
  return $before;
}

/**
 * When a Home image stops being used (replaced or deleted), add it to the cleanup list.
 * The daily cleanup deletes it after 180 days if it still isn't used anywhere.
 */
function queue_removed_images(string $table, array $before, array $after): void {
  if (!in_array($table, ['home_sections', 'home_banner_slides', 'home_gallery_photos', 'home_section_items'], true)) return;
  $marker = '/storage/v1/object/public/home-banners/';
  $afterById = [];
  foreach ($after as $r) $afterById[$r['id']] = json_encode($r, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $a = actor();
  foreach ($before as $old) {
    $oldTxt = json_encode($old, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $oldTxt = str_replace('\\/', '/', $oldTxt);
    $newTxt = str_replace('\\/', '/', $afterById[$old['id']] ?? '');
    if (!preg_match_all('#https?://[^"\s]*' . preg_quote($marker, '#') . '[^"\s?\#\\\\]+#', $oldTxt, $m)) continue;
    foreach (array_unique($m[0]) as $url) {
      $path = explode($marker, $url, 2)[1] ?? '';
      if ($path === '' || str_contains($newTxt, '/home-banners/' . $path)) continue;
      $kind = ['home_banner_slides' => 'Sponsor banner', 'home_gallery_photos' => 'Photo gallery', 'home_section_items' => 'Home button'][$table] ?? null;
      $name = null;
      if ($table === 'home_sections') {
        $kind = ['banner' => 'Sponsor banner', 'spotlight' => 'Member spotlight', 'countdown' => 'Countdown', 'text' => 'Announcement', 'gallery' => 'Photo gallery', 'events' => 'Upcoming events'][$old['type']] ?? 'Home section';
        $name = $old['title'];
      } elseif ($table === 'home_banner_slides') {
        $name = $old['sponsor_name'] ?: $old['alt_text'];
      } else {
        $name = $old['alt_text'] ?? $old['label'] ?? null;
      }
      $usedIn = mb_substr($kind . ($name ? ': ' . $name : ''), 0, 120);
      db()->prepare('INSERT IGNORE INTO home_image_cleanup (id, storage_path, image_url, used_in, replaced_by, replaced_by_name, replaced_at, delete_after) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([uuid4(), rawurldecode($path), $url, $usedIn, $a['id'], $a['name'], now_sql(), now_sql('+180 days')]);
    }
  }
}
