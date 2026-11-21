<?php
/**
 * Mind maps: visual maps of how each kind of user moves through Chamber Loop.
 * Each map is a JSON file in lib/mindmaps/ (not reachable from the web; lib/ is blocked).
 * assets/mindmap.js draws the map from the JSON embedded in the page.
 */

declare(strict_types=1);

/** The maps in the left sidebar, in order. A map with no file yet shows as "coming soon". */
const MINDMAPS = [
  'chamber-managers' => ['Chamber managers', 'Directors and board presidents'],
  'business-owners' => ['Business owners', 'Members in the Growth Portal'],
  'super-admin' => ['Super admin', 'Platform, features and integrations'],
];

function mindmap_load(string $key): ?array {
  $file = DASH_ROOT . '/lib/mindmaps/' . $key . '.json';
  if (!isset(MINDMAPS[$key]) || !is_file($file)) return null;
  $data = json_decode((string) file_get_contents($file), true);
  return is_array($data) ? $data : null;
}

function mindmaps_screen(): void {
  $key = (string) ($_GET['m'] ?? 'chamber-managers');
  if (!isset(MINDMAPS[$key])) $key = 'chamber-managers';
  $map = mindmap_load($key);
  [$label, $blurb] = MINDMAPS[$key];
  page_start('Mind maps · ' . $label, 'mindmaps');
  ?>
  <div class="mm-shell">
    <section class="mm-main">
      <?php if (!$map): ?>
        <div class="card empty">
          <h1><?= h($label) ?></h1>
          <p class="muted">This map is coming soon. Ask Claude to build it.</p>
        </div>
      <?php else: ?>
        <div class="head">
          <div>
            <h1><?= h($map['title'] ?? $label) ?></h1>
            <p class="muted small"><?= h($map['subtitle'] ?? '') ?><?= !empty($map['updated']) ? ' · updated ' . h(date('M j, Y', strtotime($map['updated']))) : '' ?></p>
          </div>
          <div class="row mm-tools">
            <button type="button" class="small" data-mm="expand">Expand all</button>
            <button type="button" class="small" data-mm="collapse">Collapse</button>
            <label class="check small"><input type="checkbox" data-mm="hide-off"> Hide what's off</label>
            <button type="button" class="small" data-mm="zoom-out" aria-label="Zoom out">−</button>
            <button type="button" class="small" data-mm="zoom-in" aria-label="Zoom in">+</button>
          </div>
        </div>
        <p class="mm-legend small">
          <span><span class="mm-chip"></span> Page or menu</span>
          <span><span class="mm-chip tab"></span> Tab inside a page</span>
          <?php if (str_contains(json_encode($map), '"kind":"svc"')): ?><span><span class="mm-chip svc"></span> Integration</span><?php endif; ?>
          <?php foreach (($map['statusLabels'] ?? []) as $s => $sl): ?>
            <span><span class="mm-chip <?= h($s) ?>"></span> <?= h($sl) ?></span>
          <?php endforeach; ?>
        </p>
        <div class="mm-body">
          <div class="mm-stage" id="mm-stage" tabindex="0" aria-label="Mind map. Click a box to open or close its branch."></div>
          <aside class="mm-detail card" id="mm-detail" aria-live="polite"><p class="muted small">Click any box to open its branch and see what it's for. Drag the background to move around.</p></aside>
        </div>
        <?php if (!empty($map['source'])): ?><p class="small muted">Source: <?= h($map['source']) ?></p><?php endif; ?>
        <script type="application/json" id="mm-data"><?= json_encode($map, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) ?></script>
        <script src="assets/mindmap.js?v=<?= DASH_VERSION . '-' . @filemtime(DASH_ROOT . '/assets/mindmap.js') ?>"></script>
      <?php endif; ?>
    </section>
  </div>
  <?php
  page_end();
}
