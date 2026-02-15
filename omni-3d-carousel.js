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

  function initCarousel(block) {
    ensureInjectedStyles();
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

    const rows = Math.max(1, cfg.rows);
    const rowsContainers = [];
    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'omni-3d-row';
      inner.appendChild(rowDiv);
      rowsContainers.push(rowDiv);
    }

    let cards = Array.from(inner.querySelectorAll(cfg.cardSelector));
    cards.forEach((card, idx) => {
      rowsContainers[idx % rows].appendChild(card);
    });

    // --- Оригинальная математика (полная версия) ---
    let angle = cfg.startAngle;
    let velocity = 0;
    let lastTime = performance.now();
    let dragging = false;
    let lastX = 0;

    function positionCards() {
      const rect = block.getBoundingClientRect();
      const minSide = Math.min(rect.width, rect.height);
      const r_val = parseUnit(cfg.radius);
      let r_px = (r_val.u === '%') ? minSide * (r_val.v / 100) : r_val.v;
      
      const cW_val = parseUnit(cfg.cardWidth);
      const cH_val = parseUnit(cfg.cardHeight);
      const cardW = (cW_val.u === '%') ? rect.width * (cW_val.v / 100) : cW_val.v;
      const cardH = (cH_val.u === '%') ? rect.height * (cH_val.v / 100) : cH_val.v;

      rowsContainers.forEach((rDiv, rIdx) => {
        const rowCards = Array.from(rDiv.querySelectorAll(cfg.cardSelector));
        const m = rowCards.length;
        const verticalOffset = (rIdx - (rows - 1) / 2) * (cardH * cfg.rowGap);
        const step = 360 / Math.max(1, m);

        rowCards.forEach((card, i) => {
          const theta = (angle + (i * step)) * Math.PI / 180;
          const x = Math.sin(theta) * r_px;
          const z = Math.cos(theta) * r_px;

          card.style.width = cardW + 'px';
          card.style.height = cardH + 'px';
          card.style.transform = `translate(-50%,-50%) translateX(${x}px) translateY(${verticalOffset}px) translateZ(${z}px) rotateY(${angle + (i * step)}deg)`;
          card.style.zIndex = Math.round(1000 + z);
          card.style.opacity = 0.45 + 0.55 * (z / r_px + 1) / 2;
        });
      });
    }

    function frame(now) {
      const dt = now - lastTime;
      lastTime = now;
      if (cfg.autoRotate && !dragging) angle += (cfg.rotateSpeed * dt / 1000);
      positionCards();
      requestAnimationFrame(frame);
    }
    
    block.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; });
    window.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      angle += dx * 0.2;
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
