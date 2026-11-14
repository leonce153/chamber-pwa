// Chamber dashboard: small progressive enhancements. Every screen works without this file
// except the Updates screen, which runs each app's update step by step.
(function () {
  'use strict';
  var csrf = (document.querySelector('meta[name="csrf"]') || {}).content || '';

  // Phone menu
  var mb = document.querySelector('.menu-btn');
  if (mb) mb.addEventListener('click', function () {
    var open = document.body.classList.toggle('nav-open');
    mb.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Confirm before forms that send or replace things
  document.querySelectorAll('form.confirm').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (!window.confirm(f.getAttribute('data-confirm') || 'Are you sure?')) e.preventDefault();
    });
  });

  // Select that submits its form
  document.querySelectorAll('select.autosubmit').forEach(function (s) {
    s.addEventListener('change', function () { s.form.submit(); });
  });

  // "All" checkboxes
  function wireAll(allId, cls) {
    var all = document.getElementById(allId);
    if (!all) return;
    var boxes = function () { return Array.prototype.slice.call(document.querySelectorAll(cls)).filter(function (b) { return !b.disabled; }); };
    all.addEventListener('change', function () { boxes().forEach(function (b) { b.checked = all.checked; }); });
    boxes().forEach(function (b) { b.addEventListener('change', function () { all.checked = boxes().every(function (x) { return x.checked; }); }); });
    all.checked = boxes().length > 0 && boxes().every(function (x) { return x.checked; });
  }
  wireAll('push-all', '.push-app');
  wireAll('targets-all', '.target');
  wireAll('check-all', '.pick');

  // Template copy: remember the chosen section's title for the activity log
  var cf = document.getElementById('copy-form');
  if (cf) cf.addEventListener('change', function (e) {
    if (e.target.name === 'what') document.getElementById('section-title').value = e.target.getAttribute('data-title') || '';
  });
  if (cf) cf.addEventListener('submit', function (e) {
    var picked = cf.querySelectorAll('.target:checked').length;
    if (!picked) { e.preventDefault(); window.alert('Tick at least one app to copy to.'); return; }
    if (!window.confirm('Copy to ' + picked + ' app' + (picked > 1 ? 's' : '') + ' now? Their current version is backed up first.')) e.preventDefault();
  });

  // Updates screen
  var run = document.getElementById('run-update');
  if (!run) return;
  var note = document.getElementById('update-note');

  function post(action, body) {
    return fetch('api.php?a=' + action, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return { error: 'HTTP ' + r.status }; }).then(function (j) {
        if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
        return j;
      });
    });
  }
  function setStatus(row, html, kind) {
    var c = row.querySelector('.status');
    c.innerHTML = '<span class="badge ' + (kind || 'gray') + '">' + html + '</span>';
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function updateOne(row, sha, short) {
    var id = Number(row.getAttribute('data-id'));
    setStatus(row, 'Moving to ' + short + '…', 'blue');
    return post('update', { id: id, sha: sha }).then(function (res) {
      setStatus(row, res.hook ? 'Hostinger is pulling…' : 'Waiting for Hostinger…', 'blue');
      var tries = 0;
      function poll() {
        tries++;
        return wait(tries === 1 ? 3000 : 5000).then(function () {
          return post('check', { id: id, short: short });
        }).then(function (c) {
          if (c.done) {
            setStatus(row, 'Updated' + (c.db && c.db.length ? ' + database' : ''), 'ok');
            var cur = row.children[2];
            if (cur) cur.innerHTML = '<span class="mono">' + short + '</span>';
            return;
          }
          if (tries === 12 && !res.hook) post('redeploy', { id: id }).catch(function () {});
          if (tries >= 36) { setStatus(row, 'Still on ' + (c.running || '?') + ' after 3 min. Check its GIT page in hPanel.', 'warn'); return; }
          setStatus(row, 'Waiting… (running ' + (c.running || '?') + ')', 'blue');
          return poll();
        });
      }
      return poll();
    }).catch(function (e) { setStatus(row, e.message, 'err'); });
  }

  run.addEventListener('click', function () {
    var sel = document.getElementById('release');
    var opt = sel.options[sel.selectedIndex];
    var rows = Array.prototype.slice.call(document.querySelectorAll('#update-table tbody tr')).filter(function (r) {
      var b = r.querySelector('.pick'); return b && b.checked;
    });
    if (!rows.length) { note.textContent = 'Tick at least one app.'; return; }
    if (!window.confirm('Update ' + rows.length + ' app' + (rows.length > 1 ? 's' : '') + ' to ' + opt.getAttribute('data-short') + '?')) return;
    run.disabled = true; sel.disabled = true;
    note.textContent = 'Working… keep this page open.';
    // one at a time, so a problem shows up before every app is touched
    rows.reduce(function (p, row) {
      return p.then(function () { return updateOne(row, opt.value, opt.getAttribute('data-short')); });
    }, Promise.resolve()).then(function () {
      note.textContent = 'Done.';
      run.disabled = false; sel.disabled = false;
    });
  });
})();
