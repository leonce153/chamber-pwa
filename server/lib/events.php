<?php
/**
 * Upcoming events from a website feed: RSS, Atom, iCal (.ics) or JSON. Cached for 30 minutes.
 * Dates without a time zone are read in the chamber's local time zone (config "timezone").
 */

declare(strict_types=1);

function local_tz(): DateTimeZone {
  try {
    return new DateTimeZone((string) config('timezone', 'America/Chicago'));
  } catch (Exception $e) {
    return new DateTimeZone('America/Chicago');
  }
}

function iso_utc(DateTimeInterface $d): string {
  return DateTimeImmutable::createFromInterface($d)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
}

function zoned_iso(int $y, int $mo, int $d, int $h, int $mi, int $s, ?string $tz = null): string {
  try {
    $zone = $tz ? new DateTimeZone($tz) : local_tz();
  } catch (Exception $e) {
    $zone = local_tz();
  }
  $dt = (new DateTimeImmutable('now', $zone))->setDate($y, $mo, $d)->setTime($h, $mi, $s);
  return iso_utc($dt);
}

function parse_loose(string $raw): ?array {
  $v = trim($raw);
  if ($v === '') return null;
  if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m)) return ['start' => zoned_iso((int) $m[1], (int) $m[2], (int) $m[3], 0, 0, 0), 'all_day' => true];
  if (preg_match('/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/', $v, $m)) {
    return ['start' => zoned_iso((int) $m[1], (int) $m[2], (int) $m[3], (int) $m[4], (int) $m[5], (int) ($m[6] ?? 0)), 'all_day' => false];
  }
  if (preg_match('/^\d{10}$/', $v)) return ['start' => iso_utc(new DateTimeImmutable('@' . $v)), 'all_day' => false];
  $t = strtotime($v);
  if ($t === false) return null;
  return ['start' => iso_utc(new DateTimeImmutable('@' . $t)), 'all_day' => false];
}

function feed_decode(string $s): string {
  $s = preg_replace('/<!\[CDATA\[([\s\S]*?)\]\]>/', '$1', $s);
  $s = preg_replace('/<[^>]+>/', ' ', $s);
  $s = html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
  return trim(preg_replace('/\s+/u', ' ', $s));
}

function xml_blocks(string $xml, string $name): array {
  preg_match_all('/<(?:[\w-]+:)?' . $name . '\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?' . $name . '>/i', $xml, $m);
  return $m[1];
}

function xml_tag(string $block, array $names): ?string {
  foreach ($names as $n) {
    if (preg_match('/<(?:[\w-]+:)?' . preg_quote($n, '/') . '\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?' . preg_quote($n, '/') . '>/i', $block, $m)) {
      $t = feed_decode($m[1]);
      if ($t !== '') return $t;
    }
  }
  return null;
}

const DATE_TAGS = ['startdate', 'start_date', 'startDate', 'eventdate', 'event_date', 'dtstart', 'start', 'date', 'pubDate', 'published', 'updated'];
const PLACE_TAGS = ['location', 'venue', 'address'];

function http_url_or_null(?string $u): ?string {
  return $u && preg_match('#^https?://#i', $u) ? $u : null;
}

function parse_rss(string $xml): array {
  $out = [];
  foreach (xml_blocks($xml, 'item') as $b) {
    $title = xml_tag($b, ['title']);
    $when = parse_loose(xml_tag($b, DATE_TAGS) ?? '');
    if (!$title || !$when) continue;
    $link = xml_tag($b, ['link']) ?? xml_tag($b, ['guid']);
    $out[] = ['title' => $title] + $when + ['location' => xml_tag($b, PLACE_TAGS), 'url' => http_url_or_null($link)];
  }
  return $out;
}

function parse_atom(string $xml): array {
  $out = [];
  foreach (xml_blocks($xml, 'entry') as $b) {
    $title = xml_tag($b, ['title']);
    $when = parse_loose(xml_tag($b, DATE_TAGS) ?? '');
    if (!$title || !$when) continue;
    preg_match_all('/<link\b([^>]*)\/?>/i', $b, $lm);
    $links = $lm[1];
    $best = null;
    foreach ($links as $a) if (preg_match('/rel=["\']alternate["\']/i', $a)) { $best = $a; break; }
    if ($best === null) foreach ($links as $a) if (!preg_match('/rel=/i', $a)) { $best = $a; break; }
    if ($best === null) $best = $links[0] ?? null;
    $href = $best && preg_match('/href=["\']([^"\']+)["\']/i', $best, $hm) ? feed_decode($hm[1]) : null;
    $out[] = ['title' => $title] + $when + ['location' => xml_tag($b, PLACE_TAGS), 'url' => http_url_or_null($href)];
  }
  return $out;
}

function ics_unescape(string $s): string {
  return trim(preg_replace('/\\\\([,;\\\\])/', '$1', preg_replace('/\\\\n/i', ' ', $s)));
}

function ics_date(string $value, string $params): ?array {
  if (!preg_match('/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/', trim($value), $m)) return null;
  if (empty($m[4]) || preg_match('/VALUE=DATE(?!-)/i', $params)) return ['start' => zoned_iso((int) $m[1], (int) $m[2], (int) $m[3], 0, 0, 0), 'all_day' => true];
  if (!empty($m[7])) {
    $d = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->setDate((int) $m[1], (int) $m[2], (int) $m[3])->setTime((int) $m[4], (int) $m[5], (int) ($m[6] ?: 0));
    return ['start' => iso_utc($d), 'all_day' => false];
  }
  $tz = preg_match('/TZID=("?)([^;:"]+)\1/i', $params, $tm) ? $tm[2] : null;
  return ['start' => zoned_iso((int) $m[1], (int) $m[2], (int) $m[3], (int) $m[4], (int) $m[5], (int) ($m[6] ?: 0), $tz), 'all_day' => false];
}

function parse_ics(string $text): array {
  $text = preg_replace("/\r\n?/", "\n", $text);
  $text = preg_replace("/\n[ \t]/", '', $text);
  $out = [];
  $cur = null;
  foreach (explode("\n", $text) as $line) {
    if (str_starts_with($line, 'BEGIN:VEVENT')) { $cur = []; continue; }
    if (str_starts_with($line, 'END:VEVENT')) {
      if ($cur !== null) {
        $summary = isset($cur['SUMMARY']) ? ics_unescape($cur['SUMMARY']['value']) : '';
        $when = isset($cur['DTSTART']) ? ics_date($cur['DTSTART']['value'], $cur['DTSTART']['params']) : null;
        $url = isset($cur['URL']) ? trim($cur['URL']['value']) : null;
        if ($summary !== '' && $when) {
          $loc = isset($cur['LOCATION']) ? ics_unescape($cur['LOCATION']['value']) : '';
          $out[] = ['title' => $summary] + $when + ['location' => $loc !== '' ? $loc : null, 'url' => http_url_or_null($url)];
        }
      }
      $cur = null;
      continue;
    }
    if ($cur === null) continue;
    $i = strpos($line, ':');
    if ($i === false) continue;
    $parts = explode(';', substr($line, 0, $i));
    $key = strtoupper(array_shift($parts));
    if (!isset($cur[$key])) $cur[$key] = ['params' => implode(';', $parts), 'value' => substr($line, $i + 1)];
  }
  return $out;
}

function pick(array $o, array $keys) {
  foreach ($keys as $k) if (isset($o[$k]) && $o[$k] !== '') return $o[$k];
  return null;
}

function json_str($v): ?string {
  if (is_string($v)) { $d = feed_decode($v); return $d !== '' ? $d : null; }
  if (is_int($v) || is_float($v)) return (string) $v;
  if (is_array($v) && !array_is_list($v)) return json_str(pick($v, ['rendered', 'name', 'title', 'text', 'address', 'venue']));
  return null;
}

function parse_json_feed(string $text): array {
  $data = json_decode($text, true);
  if (!is_array($data)) return [];
  $arr = array_is_list($data) ? $data : ($data['events'] ?? $data['items'] ?? $data['data'] ?? $data['results'] ?? []);
  if (!is_array($arr)) return [];
  $out = [];
  foreach ($arr as $o) {
    if (!is_array($o)) continue;
    $title = json_str(pick($o, ['title', 'name', 'summary', 'event_name']));
    $dateRaw = pick($o, ['start', 'start_date', 'startDate', 'start_time', 'startTime', 'starts_at', 'date', 'event_date', 'datetime']);
    $when = null;
    if (is_string($dateRaw) || is_int($dateRaw)) $when = parse_loose((string) $dateRaw);
    elseif (is_array($dateRaw)) {
      $d = pick($dateRaw, ['dateTime', 'date_time', 'local', 'utc', 'date']);
      if ($d) $when = parse_loose((string) $d);
    }
    if (!$title || !$when) continue;
    $url = json_str(pick($o, ['url', 'link', 'permalink', 'event_url', 'website']));
    $out[] = ['title' => $title] + $when + ['location' => json_str(pick($o, ['location', 'venue', 'place', 'address'])), 'url' => http_url_or_null($url)];
  }
  return $out;
}

function parse_feed(string $text): array {
  $t = trim($text);
  if ($t === '') return [];
  if ($t[0] === '{' || $t[0] === '[') return parse_json_feed($t);
  if (str_contains($t, 'BEGIN:VCALENDAR')) return parse_ics($t);
  if (preg_match('/<feed\b/i', $t)) return parse_atom($t);
  return parse_rss($t);
}

function safe_feed_url(string $raw): ?string {
  $raw = preg_replace('/^webcal:/i', 'https:', trim($raw));
  $p = parse_url($raw);
  if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) return null;
  $h = strtolower($p['host']);
  if ($h === 'localhost' || str_ends_with($h, '.local') || str_ends_with($h, '.internal') || $h[0] === '[') return null;
  $ip = filter_var($h, FILTER_VALIDATE_IP) ? $h : gethostbyname($h);
  if (filter_var($ip, FILTER_VALIDATE_IP) && !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return null;
  return $raw;
}

function upcoming_events(array $events): array {
  $now = time();
  $today = (new DateTimeImmutable('now', local_tz()))->format('Y-m-d');
  $out = array_values(array_filter($events, function ($e) use ($now, $today) {
    if ($e['all_day']) return (new DateTimeImmutable($e['start']))->setTimezone(local_tz())->format('Y-m-d') >= $today;
    return strtotime($e['start']) >= $now;
  }));
  usort($out, fn($a, $b) => strcmp($a['start'], $b['start']));
  return array_map(fn($e) => [
    'title' => mb_substr($e['title'], 0, 200),
    'start' => $e['start'],
    'all_day' => $e['all_day'],
    'location' => $e['location'] !== null ? mb_substr($e['location'], 0, 200) : null,
    'url' => $e['url'],
  ], array_slice($out, 0, 50));
}

function feed_events(string $feedUrl, string $sectionId): array {
  $url = safe_feed_url($feedUrl);
  if (!$url) throw new ApiException('The feed address is not allowed.', 400);
  $key = "events|$sectionId|$url";
  $hit = cache_get($key, 30 * 60);
  if (is_array($hit)) return upcoming_events($hit);
  try {
    [$status, $text] = http_request('GET', $url, [
      'User-Agent: ChamberApp/1.0 (+' . site_url() . ')',
      'Accept: application/rss+xml, application/atom+xml, text/calendar, application/json, text/xml, */*',
    ], null, 10, 2000000);
    if ($status < 200 || $status >= 300) throw new RuntimeException("Feed answered $status");
    $events = parse_feed($text);
    cache_put($key, $events);
    return upcoming_events($events);
  } catch (Throwable $e) {
    log_error('events: ' . $e->getMessage());
    $stale = cache_get($key, 0);
    if (is_array($stale)) return upcoming_events($stale);
    throw new ApiException('Could not read the feed.', 502);
  }
}
