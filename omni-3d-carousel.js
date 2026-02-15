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
    return m ? { v: parseFloat(m[1]), u: m[2] || 'px' } : { raw: val };
  }

  function ensureInjectedStyles() {
    if (document.getElementById('omni-3d-default-styles')) return;
    const css = `
      .omni-3d-carousel { position: relative !important; width:100% !important; min-height:200px !important; height:100% !important; overflow:visible !important; perspective:1200px !important; }
      .omni-3d-carousel .omni-3d-inner { position:absolute !important; inset:0 !important; transform-style: preserve-3d !important; display:flex !important; align-items:center !important; justify-content:center !important; pointer-events:none !important; }
      .omni-3d-carousel .omni-3d-row { position:absolute !important; inset:0 !important; transform-style: preserve-3d !important; pointer-events: none !important; }
      .omni-card--mounted { position:absolute !important; top: 50% !important; left:50% !important; transform-style: preserve-3d !important; transform-origin:center center !important; pointer-events:auto !important; margin:0 !important; will-change: transform; }
      .omni-card .tn-atom { height: inherit !important; }
    `;
    const style = document.createElement('style');
    style.id = 'omni-3d-default-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
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
    inner.className = 'omni-3d-inner';
    if (!inner.parentElement) block.insertBefore(inner, block.firstChild);

    // Сбор карточек
    let cards = Array.from(document.querySelectorAll(cfg.cardSelector));
    cards.forEach(card => {
        card.classList.add('omni-card--mounted');
        inner.appendChild(card);
    });

    const rows = Math.max(1, cfg.rows);
    const rowsContainers = [];
    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'omni-3d-row';
      inner.appendChild(rowDiv);
      rowsContainers.push(rowDiv);
    }

    // Распределение и клонирование
    function fillAndDistribute() {
        rowsContainers.forEach((rDiv, rIdx) => {
            let rowCards = cards.filter((_, i) => i % rows === rIdx);
            // Если карточек мало, клонируем их для круга
            while (rowCards.length < 5) {
                let clone = rowCards[0].cloneNode(true);
                rowCards.push(clone);
            }
            rowCards.forEach(card => rDiv.appendChild(card));
        });
    }
    fillAndDistribute();

    let angle = cfg.startAngle;
    let lastTime = performance.now();

    function positionCards() {
      const rect = block.getBoundingClientRect();
      const radiusPx = (parseUnit(cfg.radius).u === '%') ? rect.width * (parseUnit(cfg.radius).v / 100) : parseUnit(cfg.radius).v;
      const cardH = parseUnit(cfg.cardHeight).v;

      rowsContainers.forEach((rDiv, rIdx) => {
        const rowCards = Array.from(rDiv.children);
        const step = 360 / rowCards.length;
        const y = (rIdx - (rows - 1) / 2) * (cardH * cfg.rowGap);

        rowCards.forEach((card, i) => {
          const theta = (angle + (i * step)) * Math.PI / 180;
          const x = Math.sin(theta) * radiusPx;
          const z = Math.cos(theta) * radiusPx;

          card.style.width = cfg.cardWidth;
          card.style.height = cfg.cardHeight;
          card.style.transform = `translate(-50%,-50%) translateX(${x}px) translateY(${y}px) translateZ(${z}px) rotateY(${angle + (i * step)}deg)`;
          card.style.zIndex = Math.round(1000 + z);
          card.style.opacity = 0.3 + (z / radiusPx + 1) / 2;
        });
      });
    }

    function frame(now) {
      const dt = now - lastTime;
      lastTime = now;
      if (cfg.autoRotate) angle += (cfg.rotateSpeed * dt / 1000);
      positionCards();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('.omni-3d-carousel').forEach(initCarousel);
})();
