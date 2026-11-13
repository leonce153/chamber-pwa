<?php
/**
 * /api/storage/* — image uploads for the Home editor.
 * Files are saved in /uploads/<bucket>/ and served at /storage/v1/object/public/<bucket>/<file>
 * (the same address shape the old app used, so the editor code works unchanged).
 */

declare(strict_types=1);

const BUCKETS = [
  'home-banners' => ['max' => 2 * 1024 * 1024, 'types' => ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif']],
];

function bucket_dir(string $bucket): string {
  if (!isset(BUCKETS[$bucket])) throw new ApiException('Unknown storage bucket', 404);
  $dir = UPLOAD_DIR . '/' . $bucket;
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new ApiException('Upload folder is not writable', 500);
  return $dir;
}

function safe_object_path(string $path): string {
  $path = ltrim(str_replace('\\', '/', $path), '/');
  if ($path === '' || str_contains($path, '..') || !preg_match('#^[A-Za-z0-9._\-/ ]+$#', $path)) {
    throw new ApiException('Invalid file name', 400);
  }
  if (preg_match('/\.(php\d?|phtml|phar|html?|svg|js|htaccess)$/i', $path)) throw new ApiException('File type not allowed', 400);
  return $path;
}

function storage_route(string $action): void {
  require_role('editor', 'You do not have permission to manage images.');

  if ($action === 'upload') {
    $bucket = (string) ($_POST['bucket'] ?? '');
    $dir = bucket_dir($bucket);
    $path = safe_object_path((string) ($_POST['path'] ?? ''));
    $f = $_FILES['file'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) throw new ApiException('Upload failed. The image may be too large.', 400);
    $rule = BUCKETS[$bucket];
    if ($f['size'] > $rule['max']) throw new ApiException('This image is too large. The limit is ' . round($rule['max'] / 1048576) . ' MB.', 413);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
    if (!isset($rule['types'][$mime]) || @getimagesize($f['tmp_name']) === false) throw new ApiException('Use a JPG, PNG or WebP image.', 415);
    $target = $dir . '/' . $path;
    if (is_file($target) && ($_POST['upsert'] ?? '0') !== '1') throw new ApiException('The resource already exists', 409);
    if (!is_dir(dirname($target))) @mkdir(dirname($target), 0755, true);
    if (!move_uploaded_file($f['tmp_name'], $target)) throw new ApiException('Could not save the image', 500);
    @chmod($target, 0644);
    json_out(['data' => ['path' => $path]]);
  }

  $b = json_body();
  $bucket = (string) ($b['bucket'] ?? '');
  $dir = bucket_dir($bucket);

  if ($action === 'remove') {
    $removed = [];
    foreach ((array) ($b['paths'] ?? []) as $p) {
      $p = safe_object_path((string) $p);
      $file = $dir . '/' . $p;
      if (is_file($file) && @unlink($file)) $removed[] = ['name' => $p];
    }
    json_out(['data' => $removed]);
  }

  if ($action === 'list') {
    $prefix = trim((string) ($b['prefix'] ?? ''), '/');
    $base = $prefix === '' ? $dir : $dir . '/' . safe_object_path($prefix);
    $out = [];
    foreach (is_dir($base) ? scandir($base) : [] as $name) {
      if ($name[0] === '.') continue;
      $full = $base . '/' . $name;
      $isFile = is_file($full);
      $out[] = [
        'name' => $name,
        'id' => $isFile ? sha1($full) : null,
        'created_at' => $isFile ? gmdate('c', filemtime($full)) : null,
        'metadata' => $isFile ? ['size' => filesize($full), 'mimetype' => mime_content_type($full)] : null,
      ];
      if (count($out) >= (int) ($b['limit'] ?? 1000)) break;
    }
    json_out(['data' => $out]);
  }

  throw new ApiException('Not found', 404);
}
