<?php
/**
 * The chamber's name, colors and icons, read from the database (Admin → Settings / Design),
 * with config.php "branding" values as overrides. Used by index.php, manifest.php and push-worker.php.
 */

declare(strict_types=1);

function brand(): array {
  static $b = null;
  if ($b !== null) return $b;
  $s = [];
  try {
    $s = db()->query('SELECT * FROM app_settings LIMIT 1')->fetch() ?: [];
  } catch (Throwable $e) {
    $s = [];
  }
  $cfg = (array) config('branding', []);
  $pick = fn(string $k, $def = null) => ($cfg[$k] ?? null) ?: (($s[$k] ?? null) ?: $def);

  $icon = $pick('icon_url', $pick('logo_url'));
  $local = fn(string $f) => is_file(UPLOAD_DIR . '/branding/' . $f) ? '/uploads/branding/' . $f . '?v=' . filemtime(UPLOAD_DIR . '/branding/' . $f) : null;

  $b = [
    'name' => $pick('app_name', 'Chamber of Commerce'),
    'short_name' => $pick('short_name', 'Chamber'),
    'description' => $pick('description', ''),
    'theme_color' => $pick('theme_color', '#B8956B'),
    'header_light' => $cfg['header_light'] ?? '#EADCC4',
    'header_dark' => $cfg['header_dark'] ?? '#2B2118',
    'background_color' => $cfg['manifest_background'] ?? '#EADCC4',
    'icon_192' => $local('icon-192.png') ?? $icon,
    'icon_512' => $local('icon-512.png') ?? $icon,
    'apple_icon' => $local('apple-touch-icon.png') ?? $icon,
    'icon_maskable' => $local('icon-maskable-512.png'),
    'share_image' => $pick('logo_url', $icon),
    'gravitec_app_key' => (string) config('gravitec.app_key', ''),
    'gcm_sender_id' => (string) config('gravitec.gcm_sender_id', '330561634409'),
  ];
  return $b;
}

function abs_url(?string $u): ?string {
  if (!$u) return $u;
  return str_starts_with($u, '/') ? site_url() . $u : $u;
}

/**
 * Makes app icons (192, 512, Apple 180) from a source image URL or file, saved in /uploads/branding.
 * Returns an error message or null.
 */
function make_brand_icons(string $source): ?string {
  if (!function_exists('imagecreatefromstring')) return 'The GD image extension is not enabled.';
  try {
    if (preg_match('#^https?://#i', $source)) {
      [$status, $data] = http_request('GET', $source, ['User-Agent: ChamberApp/1.0'], null, 20, 10000000);
      if ($status !== 200) return "Could not download the icon ($status).";
    } else {
      $data = (string) @file_get_contents($source);
    }
  } catch (Throwable $e) {
    return 'Could not download the icon: ' . $e->getMessage();
  }
  $img = @imagecreatefromstring($data);
  if (!$img) return 'The icon is not a readable image.';
  $dir = UPLOAD_DIR . '/branding';
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  file_put_contents($dir . '/source-icon', $data);
  // Solid chamber-beige background (iOS turns transparent corners black; Android crops maskable icons).
  $hex = ltrim(brand()['header_light'], '#');
  $w = imagesx($img);
  $h = imagesy($img);
  $side = min($w, $h);
  foreach ([
    'icon-192.png' => [192, 1.0], 'icon-512.png' => [512, 1.0],
    'icon-maskable-512.png' => [512, 0.8], 'apple-touch-icon.png' => [180, 0.9],
  ] as $file => [$size, $scale]) {
    $dst = imagecreatetruecolor($size, $size);
    imagefill($dst, 0, 0, imagecolorallocate($dst, hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))));
    imagealphablending($dst, true);
    $inner = (int) round($size * $scale);
    $off = (int) (($size - $inner) / 2);
    imagecopyresampled($dst, $img, $off, $off, (int) (($w - $side) / 2), (int) (($h - $side) / 2), $inner, $inner, $side, $side);
    imagepng($dst, $dir . '/' . $file);
    imagedestroy($dst);
  }
  imagedestroy($img);
  return null;
}
