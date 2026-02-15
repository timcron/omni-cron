

(function() {
  'use strict';

  const OMNI_3D_DEFAULTS = {
    cardSelector: '.omni-card',
    radius: '35%',
    radiusFromParent: false,
    rows: 1,
    rowGap: 1.0,
    spacing: '10px',
    autoRotate: true,
    rotateSpeed: 12,
    axis: 'y',
    perspective: 1200,
    autoscale: true,
    cardWidth: '220px',
    cardHeight: '300px',
    gap: 0,
    inertia: 0.9,
    startAngle: 0,
    easeMs: 0,
    fillRows: true,
    maxClonesPerRow: 64,
    uniformRadius: true,
    rowShift: false,
    rowShiftFactor: 0.5,
    wheelSpeed: 0.35,
    wheelInvert: false,
    wheelInertia: 0.9,
    scrollMode: 'window',
    scrollSpeed: 0.06,
    scrollInvert: false,
    scrollInertia: 0.3,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    placeInsideParent: false
  };

  function parseUnit(val) {
    if (val == null) return null;
    val = String(val).trim();
    const m = val.match(/^([+-]?\d*\.?\d+)(px|%)?$/);
    if (!m) return { raw: val };
    return { v: parseFloat(m[1]), u: m[2] || 'px' };
  }

  function ensureInjectedStyles() {
    if (document.getElementById('omni-3d-default-styles')) return;
    const css = `
.omni-3d-carousel { position: relative !important; width:100% !important; min-height:200px !important; height:100% !important; overflow:visible !important; perspective-origin:50% 50% !important; -webkit-perspective-origin:50% 50% !important; -webkit-perspective:1200px !important; perspective:1200px !important; touch-action: pan-y !important; }
.omni-3d-carousel .omni-3d-inner { position:absolute !important; inset:0 !important; height:100% !important; transform-style: preserve-3d !important; -webkit-transform-style: preserve-3d !important; display:flex !important; align-items:center !important; justify-content:center !important; pointer-events:none !important; }
.omni-3d-carousel .omni-3d-row { position:absolute !important; inset:0 !important; transform-style: preserve-3d !important; pointer-events: none !important; }
.omni-3d-carousel .omni-card--mounted { position:absolute !important; top: 50% !important; left:50% !important; transform-style: preserve-3d !important; -webkit-transform-style: preserve-3d !important; transform-origin:center center !important; pointer-events:auto !important; box-sizing:border-box !important; transition: transform 400ms cubic-bezier(.2,.9,.3,1) !important; will-change: transform, user-select:none !important; cursor:grab !important; display:block !important; margin:0 !important; }
.omni-3d-carousel .omni-card--mounted:active { cursor:grabbing !important; }
.omni-3d-carousel .omni-card--mounted .omni-card-inner { display:block !important; width:100% !important; height:100% !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 8px 20px rgba(0,0,0,.18) !important; background:#fff !important; display:flex !important; align-items:center !important; justify-content:center !important; }
.omni-3d-carousel .omni-card--mounted img { display:block !important; width:100% !important; height:100% !important; object-fit:cover !important; -webkit-user-drag:none !important; user-drag:none !important; user-select:none !important; -webkit-touch-callout:none !important; pointer-events:none !important; }
@media (max-height:320px){ .omni-3d-carousel{ height:320px !important; } }
.omni-card .tn-atom {height:inherit !important}
`;
    const style = document.createElement('style');
    style.id = 'omni-3d-default-styles';
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  function preventImageDrag(img) {
    try { img.draggable = false; } catch(e){}
    const onDragStart = (ev) => { ev.preventDefault(); };
    img.addEventListener('dragstart', onDragStart, { passive: false });
    img.addEventListener('pointerdown', (ev) => { try { ev.preventDefault && ev.preventDefault(); } catch(e){} }, { passive: false });
    try {
      img.style.setProperty('-webkit-user-drag', 'none', 'important');
      img.style.setProperty('user-drag', 'none', 'important');
      img.style.setProperty('user-select', 'none', 'important');
      img.style.setProperty('-webkit-touch-callout', 'none', 'important');
      img.style.setProperty('pointer-events', 'none', 'important');
    } catch (e) {}
  }

  function placeCarouselInsideParentIfNeeded(block, cfg) {
    if (!cfg.placeInsideParent) return;
    const parent = block.parentElement;
    if (!parent) return;
    try {
      const pStyle = getComputedStyle(parent);
      if (pStyle.position === 'static') parent.style.position = 'relative';
      if (block.parentElement !== parent) parent.appendChild(block);
      block.style.position = 'absolute';
      block.style.transform = 'none';
      block.style.transformOrigin = 'center center';
      block.style.pointerEvents = 'auto';
      function centerByPixels() {
        const pRect = parent.getBoundingClientRect();
        const bRect = block.getBoundingClientRect();
        if (!pRect || pRect.height < 2) return;
        const parentInnerW = parent.clientWidth;
        const parentInnerH = parent.clientHeight;
        const bW = block.offsetWidth || bRect.width;
        const bH = block.offsetHeight || bRect.height;
        block.style.left = Math.max(0, Math.round((parentInnerW - bW) / 2)) + 'px';
        block.style.top = Math.max(0, Math.round((parentInnerH - bH) / 2)) + 'px';
      }
      centerByPixels();
      Array.from(block.querySelectorAll('img')).forEach(img => {
        if (!img.complete) img.addEventListener('load', centerByPixels, { once: true });
      });
    } catch (e) {}
  }

  function initCarousel(block) {
    ensureInjectedStyles();
    const cfgInit = Object.assign({}, OMNI_3D_DEFAULTS);
    if (block.dataset && block.dataset.placeInsideParent !== undefined) {
      cfgInit.placeInsideParent = block.dataset.placeInsideParent === 'true';
    }
    placeCarouselInsideParentIfNeeded(block, cfgInit);

    const data = block.dataset;
    const cfg = Object.assign({}, OMNI_3D_DEFAULTS);

    Object.keys(cfg).forEach(key => {
      if (data[key] !== undefined) {
        if (typeof OMNI_3D_DEFAULTS[key] === 'boolean') cfg[key] = data[key] === 'true';
        else if (typeof OMNI_3D_DEFAULTS[key] === 'number') cfg[key] = parseFloat(data[key]);
        else cfg[key] = data[key];
      }
    });

    let inner = block.querySelector('.omni-3d-inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'omni-3d-inner';
      block.insertBefore(inner, block.firstChild);
    }

    let allCandidates = Array.from(document.querySelectorAll(cfg.cardSelector));
    allCandidates.filter(el => !inner.contains(el)).forEach(el => {
      el.classList.add('omni-card--mounted');
      Array.from(el.querySelectorAll('img')).forEach(preventImageDrag);
      inner.appendChild(el);
    });

    const stage = inner;
    let cards = Array.from(stage.querySelectorAll(cfg.cardSelector));
    if (!stage || cards.length === 0) return;

    Array.from(stage.querySelectorAll('.omni-3d-row')).forEach(r => {
      Array.from(r.children).forEach(ch => stage.appendChild(ch));
      r.remove();
    });

    const rows = Math.max(1, cfg.rows);
    const rowsContainers = [];
    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'omni-3d-row';
      stage.appendChild(rowDiv);
      rowsContainers.push(rowDiv);
    }

    cards = Array.from(stage.querySelectorAll(cfg.cardSelector));
    cards.forEach((card, idx) => {
      rowsContainers[idx % rows].appendChild(card);
      card.classList.add('omni-card--mounted');
    });

    // --- Core Math Engine ---
    let angle = cfg.startAngle;
    let velocity = 0;
    let lastTime = performance.now();
    let dragging = false;
    let lastX = 0;

    function positionCards() {
      const rect = block.getBoundingClientRect();
      const minSide = Math.min(rect.width, rect.height);
      let radiusPx = (parseUnit(cfg.radius).u === '%') ? minSide * (parseUnit(cfg.radius).v / 100) : parseUnit(cfg.radius).v;
      
      const cardW = (parseUnit(cfg.cardWidth).u === '%') ? rect.width * (parseUnit(cfg.cardWidth).v / 100) : parseUnit(cfg.cardWidth).v;
      const cardH = (parseUnit(cfg.cardHeight).u === '%') ? rect.height * (parseUnit(cfg.cardHeight).v / 100) : parseUnit(cfg.cardHeight).v;

      rowsContainers.forEach((rDiv, rIdx) => {
        const rowCards = Array.from(rDiv.querySelectorAll(cfg.cardSelector));
        const m = rowCards.length;
        const verticalOffset = (rIdx - (rows - 1) / 2) * (cardH * cfg.rowGap);
        const angularStepDeg = 360 / m;

        rowCards.forEach((card, i) => {
          const localT = (i * angularStepDeg) + cfg.gap;
          const theta = (localT + angle) * Math.PI / 180;
          const x = Math.sin(theta) * radiusPx;
          const z = Math.cos(theta) * radiusPx;

          card.style.width = cardW + 'px';
          card.style.height = cardH + 'px';
          card.style.transform = `translate(-50%,-50%) translateX(${x}px) translateY(${verticalOffset}px) translateZ(${z}px) rotateY(${localT + angle}deg)`;
          card.style.zIndex = Math.round(1000 + z);
          card.style.opacity = 0.45 + 0.55 * (z / radiusPx + 1) / 2;
        });
      });
    }

    function frame(now) {
      const dt = now - lastTime;
      lastTime = now;
      if (cfg.autoRotate && !dragging) angle += (cfg.rotateSpeed * dt / 1000);
      if (Math.abs(velocity) > 0.01) {
          angle += velocity;
          velocity *= cfg.inertia;
      }
      positionCards();
      requestAnimationFrame(frame);
    }

    block.addEventListener('pointerdown', e => {
      dragging = true;
      lastX = e.clientX;
    });
    window.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      velocity = dx * 0.5;
      angle += velocity;
    });
    window.addEventListener('pointerup', () => dragging = false);

    requestAnimationFrame(frame);
  }

  function initAll() {
    document.querySelectorAll('.omni-3d-carousel').forEach(initCarousel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
})();