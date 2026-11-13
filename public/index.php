<?php
/**
 * Serves the app shell (the built index.html) with this chamber's name, colors and icons filled in.
 */
declare(strict_types=1);
require_once __DIR__ . '/server/lib/bootstrap.php';
require_once __DIR__ . '/server/lib/brand.php';

if (!is_installed()) {
  header('Location: /install.php');
  exit;
}

$html = @file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
  http_response_code(500);
  echo 'The app files are missing. Re-run the deploy.';
  exit;
}

$b = brand();
$e = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
$gravitec = $b['gravitec_app_key'] !== ''
  ? '<script src="https://cdn.gravitec.net/storage/' . $e(rawurlencode($b['gravitec_app_key'])) . '/client.js" async></script>'
  : '';
$assistant = is_file(UPLOAD_DIR . '/branding/assistant.png') ? '/uploads/branding/assistant.png?v=' . filemtime(UPLOAD_DIR . '/branding/assistant.png') : (config('branding.assistant_image_url') ?: null);
$chamberJs = '<script>window.__CHAMBER__=' . json_encode(['assistantImage' => $assistant], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . ';</script>';
$version = substr(sha1($b['name'] . $b['icon_192'] . $b['theme_color'] . APP_VERSION), 0, 8);

$map = [
  '{{NAME}}' => $e($b['name']),
  '{{SHORT_NAME}}' => $e($b['short_name']),
  '{{DESCRIPTION}}' => $e($b['description']),
  '{{ICON_192}}' => $e($b['icon_192']),
  '{{APPLE_ICON}}' => $e($b['apple_icon']),
  '{{SHARE_IMAGE}}' => $e(abs_url($b['share_image'])),
  '{{HEADER_LIGHT}}' => $e($b['header_light']),
  '{{HEADER_DARK}}' => $e($b['header_dark']),
  '{{VERSION}}' => $version,
  '<!--{{GRAVITEC}}-->' => $chamberJs . $gravitec,
];

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
echo strtr($html, $map);
