<?php
/** Service worker: Gravitec push + offline caching. Served at /push-worker.js. */
declare(strict_types=1);
require_once __DIR__ . '/server/lib/bootstrap.php';
header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-cache');
header('Service-Worker-Allowed: /');
$key = (string) config('gravitec.app_key', '');
if ($key !== '') {
  echo 'self["appKey"] = ' . json_encode($key) . ";\n";
  echo "self[\"hostUrl\"] = \"https://cdn.gravitec.net/sw\";\n";
  echo "self.importScripts(self[\"hostUrl\"] + \"/worker.js\");\n";
}
echo "self.importScripts('/sw.js');\n";
