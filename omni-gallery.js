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
    placeInsideParent: true
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
.omni-3d-carousel { position: relative !important; width:100% !important; min-height:200px !important; height:100% !important; overflow:visible !important; perspective-origin:50% 50% !important; perspective:1200px !important; touch-action: pan-y !important; }
.omni-3d-carousel .omni-3d-inner { position:absolute !important; inset:0 !important; height:100% !important; transform-style: preserve-3d !important; display:flex !important; align-items:center !important; justify-content:center !important; pointer-events:none !important; }
.omni-3d-carousel .omni-3d-row { position:absolute !important; inset:0 !important; transform-style: preserve-3d !important; pointer-events: none !important; }
.omni-3d-carousel .omni-card--mounted { position:absolute !important; top: 50% !important; left:50% !important; transform-style: preserve-3d !important; transform-origin:center center !important; pointer-events:auto !important; box-sizing:border-box !important; transition: transform 400ms cubic-bezier(.2,.9,.3,1) !important; will-change: transform; cursor:grab !important; display:block !important; margin:0 !important; }
.omni-3d-carousel .omni-card--mounted img { display:block !important; width:100% !important; height:100% !important; object-fit:cover !important; -webkit-user-drag:none !important; user-drag:none !important; user-select:none !important; pointer-events:none !important; }
.omni-card .tn-atom {height:inherit !important}
`;
    const style = document.createElement('style');
    style.id = 'omni-3d-default-styles';
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  function preventImageDrag(img) {
    try { img.draggable = false; } catch(e){}
    img.addEventListener('dragstart', (ev) => { ev.preventDefault(); });
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

    let inner = block.querySelector('.omni-3d-inner') || document.createElement('div');
    if (!inner.parentElement) {
      inner.className = 'omni-3d-inner';
      block.insertBefore(inner, block.firstChild);
    }

    const cards = Array.from(document.querySelectorAll(cfg.cardSelector));
    cards.forEach(el => {
      if (!inner.contains(el)) {
        el.classList.add('omni-card--mounted');
        Array.from(el.querySelectorAll('img')).forEach(preventImageDrag);
        inner.appendChild(el);
      }
    });


  }

  document.querySelectorAll('.omni-3d-carousel').forEach(initCarousel);
})();
