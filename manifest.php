<?php
/** Web app manifest built from this chamber's settings. */
declare(strict_types=1);
require_once __DIR__ . '/server/lib/bootstrap.php';
require_once __DIR__ . '/server/lib/brand.php';

$b = is_installed() ? brand() : ['name' => 'Chamber', 'short_name' => 'Chamber', 'description' => '', 'theme_color' => '#B8956B', 'background_color' => '#EADCC4', 'icon_192' => null, 'icon_512' => null, 'gcm_sender_id' => ''];
$icons = [];
foreach (['192x192' => $b['icon_192'], '512x512' => $b['icon_512']] as $size => $src) {
  if ($src) $icons[] = ['src' => $src, 'sizes' => $size, 'type' => 'image/png', 'purpose' => 'any'];
}
if (!empty($b['icon_maskable'])) $icons[] = ['src' => $b['icon_maskable'], 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'];
$m = [
  'id' => '/',
  'name' => $b['name'],
  'short_name' => $b['short_name'],
  'description' => $b['description'],
  'start_url' => '/',
  'scope' => '/',
  'display' => 'standalone',
  'background_color' => $b['background_color'],
  'theme_color' => $b['theme_color'],
  'orientation' => 'portrait-primary',
  'icons' => $icons,
];
if (!empty($b['gcm_sender_id'])) {
  $m['gcm_sender_id'] = $b['gcm_sender_id'];
  $m['gcm_user_visible_only'] = true;
}
header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($m, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
