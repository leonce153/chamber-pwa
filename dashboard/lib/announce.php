<?php
/**
 * Email announcements from HQ to CRM contacts, sent one by one from info@chamberloop.com
 * through the info@ mailbox (lib/mailer.php). Each email has a personal unsubscribe link (unsubscribe.php)
 * that sets contacts.do_not_email. Contacts marked "do not email" are never sent to.
 */

declare(strict_types=1);

/** Audience key => label */
const ANN_AUDIENCES = [
  'chambers' => 'Chamber customers',
  'prospects' => 'Prospect chambers',
  'sponsors' => 'Sponsors',
  'everyone' => 'Everyone in Contacts',
  'pick' => 'Only the chambers I tick',
];

/** Largest send in one go (Hostinger limits outgoing mail per hour). */
const ANN_MAX = 250;

/**
 * Contacts to send to, one per email address.
 * @return array<int, array{id:int, name:string, email:string, org_id:?int, org_name:?string}>
 */
function ann_recipients(string $audience, array $chamberIds = []): array {
  $where = "c.email IS NOT NULL AND c.email <> '' AND c.do_not_email = 0";
  // Chambers still in the Prospect stage (cold lists from a CSV import) never get bulk email.
  // They join the audiences once their lead moves on to New, Contacted or later.
  if ($audience !== 'pick') {
    $where .= " AND (c.org_id IS NULL OR c.org_id NOT IN (SELECT org_id FROM deals WHERE pipeline = 'chamber' AND stage = 'prospect' AND org_id IS NOT NULL))";
  }
  $args = [];
  switch ($audience) {
    case 'chambers':
      $where .= " AND (o.kind = 'chamber' OR o.id IN (SELECT org_id FROM chambers WHERE org_id IS NOT NULL))";
      break;
    case 'prospects':
      $where .= " AND o.kind = 'prospect' AND o.id NOT IN (SELECT org_id FROM chambers WHERE org_id IS NOT NULL)";
      break;
    case 'sponsors':
      $where .= " AND (o.kind = 'sponsor' OR o.id IN (SELECT sponsor_org_id FROM chambers WHERE sponsor_org_id IS NOT NULL))";
      break;
    case 'everyone':
      break;
    case 'pick':
      $ids = array_values(array_filter(array_map('intval', $chamberIds)));
      if (!$ids) return [];
      $where .= ' AND o.id IN (SELECT org_id FROM chambers WHERE org_id IS NOT NULL AND id IN (' . implode(',', array_fill(0, count($ids), '?')) . '))';
      $args = $ids;
      break;
    default:
      return [];
  }
  $out = [];
  foreach (rows("SELECT c.id, c.name, c.email, c.org_id, o.name AS org_name FROM contacts c LEFT JOIN orgs o ON o.id = c.org_id WHERE $where ORDER BY o.name, c.name", $args) as $r) {
    $key = strtolower(trim((string) $r['email']));
    if (!filter_var($key, FILTER_VALIDATE_EMAIL) || isset($out[$key])) continue;
    $out[$key] = $r;
  }
  return array_values($out);
}

function ann_base_url(): string {
  return rtrim((string) cfg('base_url', 'https://dashboard.chamberloop.com'), '/');
}

function unsub_token(int $contactId): string {
  return substr(hash_hmac('sha256', "unsubscribe:$contactId", (string) cfg('secret')), 0, 32);
}

function unsub_url(int $contactId): string {
  return ann_base_url() . '/unsubscribe.php?c=' . $contactId . '&t=' . unsub_token($contactId);
}

/** The email's HTML: the message (Markdown) in a plain, readable layout. */
function ann_html(string $subject, string $bodyMd, ?string $unsubUrl): string {
  $body = md($bodyMd);
  $body = str_replace(['<p>', '<h2>', '<h3>', '<h4>', '<a ', '<ul>', '<ol>', '<blockquote>'], [
    '<p style="margin:0 0 14px">', '<h2 style="font-size:20px;margin:22px 0 10px">', '<h3 style="font-size:17px;margin:20px 0 8px">', '<h4 style="font-size:15px;margin:18px 0 6px">',
    '<a style="color:#1f5f4a" ', '<ul style="margin:0 0 14px;padding-left:22px">', '<ol style="margin:0 0 14px;padding-left:22px">', '<blockquote style="margin:0 0 14px;padding-left:12px;border-left:3px solid #d6ddd9;color:#4a5a54">',
  ], $body);
  $foot = 'Chamber Loop · <a style="color:#6b7a74" href="https://chamberloop.com">chamberloop.com</a>'
    . ($unsubUrl ? ' · <a style="color:#6b7a74" href="' . h($unsubUrl) . '">Unsubscribe</a>' : '');
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . h($subject) . '</title></head>'
    . '<body style="margin:0;padding:0;background:#f4f6f5">'
    . '<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1d2b26">'
    . '<div style="background:#fff;border-radius:12px;padding:28px 24px;border:1px solid #e3e8e5">' . $body . '</div>'
    . '<p style="font-size:12px;color:#6b7a74;text-align:center;margin:16px 0 0">' . $foot . '</p>'
    . '</div></body></html>';
}

/** Plain-text version for mail apps that don't show HTML. */
function ann_text(string $bodyMd, ?string $unsubUrl): string {
  $t = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '$1 ($2)', $bodyMd);
  $t = preg_replace('/^#{1,4}\s+/m', '', $t);
  $t = str_replace(['**', '`'], '', $t);
  return trim($t) . "\n\n--\nChamber Loop · chamberloop.com\n" . ($unsubUrl ? "Unsubscribe: $unsubUrl\n" : '');
}

/** Send one announcement email. Returns true when mail() accepted it. */
function ann_send_one(string $to, string $subject, string $bodyMd, ?int $contactId): bool {
  $from = (string) cfg('mail_from', 'info@chamberloop.com');
  $unsub = $contactId ? unsub_url($contactId) : null;
  $boundary = 'b' . bin2hex(random_bytes(12));
  $headers = "From: Chamber Loop <$from>\r\nReply-To: $from\r\nMIME-Version: 1.0\r\n"
    . "Content-Type: multipart/alternative; boundary=\"$boundary\"";
  if ($unsub) $headers .= "\r\nList-Unsubscribe: <$unsub>, <mailto:$from?subject=unsubscribe>";
  $msg = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode(ann_text($bodyMd, $unsub)))
    . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode(ann_html($subject, $bodyMd, $unsub)))
    . "--$boundary--\r\n";
  $subj = '=?UTF-8?B?' . base64_encode(preg_replace('/[\r\n]+/', ' ', $subject)) . '?=';
  return hq_mail($to, $subj, $msg, $headers);
}
