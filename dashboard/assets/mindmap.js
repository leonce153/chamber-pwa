// Mind maps: draws the map in #mm-data as a branching tree, root on the left.
// Click a box to open or close its branch and to see what it is for.
(function () {
  'use strict';
  var stage = document.getElementById('mm-stage');
  var dataEl = document.getElementById('mm-data');
  var detail = document.getElementById('mm-detail');
  if (!stage || !dataEl) return;
  var map = JSON.parse(dataEl.textContent);
  var labels = map.statusLabels || {};

  var W = 210, H = 48, ROOT_W = 230, GAP_X = 56, GAP_Y = 10;
  var COLORS = ['#1f5f4a', '#1e5aa8', '#9a4d00', '#7a3fa0', '#a3324a', '#2f7d84', '#5b6b1e', '#6a716d'];
  var zoom = 1, hideOff = false, selected = null, uid = 0;

  // Prepare: ids, depth, branch color; start with the first two levels open.
  (function prep(n, depth, color) {
    n._id = ++uid;
    n._depth = depth;
    n._color = color;
    n._open = depth < 1;
    (n.children || []).forEach(function (c, i) {
      prep(c, depth + 1, depth === 0 ? COLORS[i % COLORS.length] : color);
    });
  })(map.root, 0, '#1d2320');

  function kids(n) {
    return (n.children || []).filter(function (c) { return !(hideOff && c.status === 'off'); });
  }

  function layout() {
    var slot = 0, nodes = [], maxX = 0;
    (function place(n) {
      n._x = n._depth === 0 ? 0 : ROOT_W + GAP_X + (n._depth - 1) * (W + GAP_X);
      maxX = Math.max(maxX, n._x + (n._depth === 0 ? ROOT_W : W));
      nodes.push(n);
      var ks = n._open ? kids(n) : [];
      if (!ks.length) { n._y = slot * (H + GAP_Y); slot++; return; }
      ks.forEach(place);
      n._y = (ks[0]._y + ks[ks.length - 1]._y) / 2;
    })(map.root);
    return { nodes: nodes, width: maxX + 20, height: slot * (H + GAP_Y) + 10 };
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    var L = layout();
    stage.textContent = '';
    var sizer = el('div', 'mm-sizer');
    sizer.style.width = L.width * zoom + 'px';
    sizer.style.height = L.height * zoom + 'px';
    var inner = el('div', 'mm-inner');
    inner.style.width = L.width + 'px';
    inner.style.height = L.height + 'px';
    inner.style.transform = 'scale(' + zoom + ')';

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', L.width);
    svg.setAttribute('height', L.height);
    svg.setAttribute('class', 'mm-lines');
    svg.setAttribute('aria-hidden', 'true');
    L.nodes.forEach(function (n) {
      if (!n._open) return;
      var x1 = n._x + (n._depth === 0 ? ROOT_W : W), y1 = n._y + H / 2;
      kids(n).forEach(function (c) {
        var x2 = c._x, y2 = c._y + H / 2, mx = (x1 + x2) / 2;
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2);
        p.setAttribute('stroke', c._color);
        if (c.status) p.setAttribute('stroke-dasharray', '4 4');
        svg.appendChild(p);
      });
    });
    inner.appendChild(svg);

    L.nodes.forEach(function (n) {
      var b = el('button', 'mm-node' + (n._depth === 0 ? ' root' : '') + (n.kind ? ' ' + n.kind : '') +
        (n.status ? ' ' + n.status : '') + (selected === n ? ' sel' : ''));
      b.type = 'button';
      b.style.left = n._x + 'px';
      b.style.top = n._y + 'px';
      b.style.width = (n._depth === 0 ? ROOT_W : W) + 'px';
      b.style.setProperty('--c', n._color);
      var all = n.children || [], ks = kids(n);
      var top = el('span', 'mm-label', n.label);
      b.appendChild(top);
      var meta = n.status ? labels[n.status] || n.status : n.kind === 'svc' ? 'Integration' : (n.uses && n.uses.length ? 'Uses ' + n.uses.join(', ') : (n.path || (all.length ? all.length + (n.kind === 'tab' ? '' : ' inside') : (n.kind === 'tab' ? 'tab' : ''))));
      b.appendChild(el('span', 'mm-meta', meta));
      if (ks.length) {
        b.appendChild(el('span', 'mm-toggle', n._open ? '−' : '+'));
        b.setAttribute('aria-expanded', n._open ? 'true' : 'false');
      }
      b.title = n.desc || n.label;
      b.addEventListener('click', function () {
        if (ks.length) n._open = !n._open;
        selected = n;
        show(n);
        // Keep the clicked box where it was on screen.
        var before = b.getBoundingClientRect();
        render();
        var now = stage.querySelector('.mm-node.sel');
        if (now) {
          var after = now.getBoundingClientRect();
          stage.scrollTop += after.top - before.top;
          stage.scrollLeft += after.left - before.left;
          // If a branch just opened past the right edge, slide it into view.
          if (n._open && ks.length) {
            var over = after.right + (W + GAP_X) * zoom - stage.getBoundingClientRect().right + 16;
            if (over > 0) stage.scrollLeft += over;
          }
        }
      });
      inner.appendChild(b);
    });
    sizer.appendChild(inner);
    stage.appendChild(sizer);
  }

  function trail(target) {
    var out = [];
    (function walk(n, path) {
      path = path.concat(n);
      if (n === target) { out = path; return true; }
      return (n.children || []).some(function (c) { return walk(c, path); });
    })(map.root, []);
    return out;
  }

  function show(n) {
    if (!detail) return;
    detail.textContent = '';
    detail.appendChild(el('p', 'mm-trail small muted', trail(n).map(function (t) { return t.label; }).join('  ›  ')));
    var h = el('h2', null, n.label);
    if (n.status) { h.appendChild(document.createTextNode(' ')); h.appendChild(el('span', 'badge ' + (n.status === 'off' ? 'warn' : 'blue'), labels[n.status] || n.status)); }
    detail.appendChild(h);
    if (n.desc) detail.appendChild(el('p', null, n.desc));
    if (n.path) detail.appendChild(el('p', 'small mono', n.path));
    // Integration details: what a feature uses, or where a service is set up and what uses it.
    [['uses', 'Integrations used'], ['where', 'Where it is set up'], ['keys', 'Keys and secrets'], ['usedBy', 'Used by'], ['setup', 'New chamber setup']].forEach(function (f) {
      var v = n[f[0]];
      if (!v || (Array.isArray(v) && !v.length)) return;
      var box = el('div', 'mm-field');
      box.appendChild(el('p', 'mm-field-label', f[1]));
      if (Array.isArray(v)) {
        var ul = el('ul');
        v.forEach(function (x) { ul.appendChild(el('li', null, x)); });
        box.appendChild(ul);
      } else box.appendChild(el('p', null, v));
      detail.appendChild(box);
    });
    if (n.children && n.children.length) detail.appendChild(el('p', 'small muted', n.children.map(function (c) { return c.label; }).join(' · ')));
  }

  function setAll(open) {
    (function walk(n) { n._open = open || n._depth === 0; (n.children || []).forEach(walk); })(map.root);
    render();
  }

  document.querySelectorAll('[data-mm]').forEach(function (c) {
    var a = c.getAttribute('data-mm');
    c.addEventListener(a === 'hide-off' ? 'change' : 'click', function () {
      if (a === 'expand') setAll(true);
      else if (a === 'collapse') setAll(false);
      else if (a === 'hide-off') { hideOff = c.checked; render(); }
      else if (a === 'zoom-in') { zoom = Math.min(1.6, zoom + 0.1); render(); }
      else if (a === 'zoom-out') { zoom = Math.max(0.4, zoom - 0.1); render(); }
    });
  });

  // Drag the background to pan.
  var drag = null;
  stage.addEventListener('mousedown', function (e) {
    if (e.target.closest('.mm-node')) return;
    drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop };
    stage.classList.add('dragging');
  });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    stage.scrollLeft = drag.l - (e.clientX - drag.x);
    stage.scrollTop = drag.t - (e.clientY - drag.y);
  });
  window.addEventListener('mouseup', function () { drag = null; stage.classList.remove('dragging'); });

  render();
})();
