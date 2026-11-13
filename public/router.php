<?php
// Local development only (php -S). Mirrors the .htaccess rules. Blocked on the real server.
if (PHP_SAPI !== 'cli-server') { http_response_code(404); exit; }
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$root = __DIR__;
if (preg_match('#^/(data|server)(/|$)#', $uri)) { http_response_code(403); exit; }
if (preg_match('#^/api(/.*)?$#', $uri)) { require $root . '/api/index.php'; return true; }
if (preg_match('#^/storage/v1/object/public/(.+)$#', $uri, $m)) {
  $f = realpath($root . '/uploads/' . $m[1]);
  if ($f && str_starts_with($f, realpath($root . '/uploads')) && is_file($f)) {
    header('Content-Type: ' . mime_content_type($f)); readfile($f); return true;
  }
  http_response_code(404); return true;
}
if ($uri === '/manifest.json') { require $root . '/manifest.php'; return true; }
if ($uri === '/push-worker.js') { require $root . '/push-worker.php'; return true; }
if ($uri === '/index.html' || $uri === '/') { require $root . '/index.php'; return true; }
if (is_file($root . $uri)) {
  if (str_ends_with($uri, '.php')) { require $root . $uri; return true; }
  return false;
}
require $root . '/index.php';
return true;
