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
    if (parent === document.body || parent === document.documentElement) return;
    if (block.dataset && block.dataset.noParent === 'true') return;

    try {
      const pStyle = getComputedStyle(parent);
      if (pStyle.position === 'static') {
        parent.style.position = 'relative';
      }

      if (block.parentElement !== parent) parent.appendChild(block);

      block.style.position = 'absolute';
      block.style.transform = 'none';
      block.style.transformOrigin = 'center center';
      block.style.pointerEvents = 'auto';
      if (!block.style.width) block.style.maxWidth = '100%';
      if (!block.style.height) block.style.maxHeight = '100%';

      function centerByPixels() {
        const pRect = parent.getBoundingClientRect();
        const bRect = block.getBoundingClientRect();

        if (!pRect || pRect.height < 2 || pRect.width < 2) {
          block.style.left = '50%';
          block.style.top = '50%';
          block.style.transform = 'translate(-50%,-50%)';
          return;
        }

        const parentInnerW = Math.max(0, parent.clientWidth);
        const parentInnerH = Math.max(0, parent.clientHeight);

        block.style.left = '0';
        block.style.top = '0';
        block.style.transform = 'none';
        const bW = block.offsetWidth || Math.round(bRect.width) || Math.min(parentInnerW, 200);
        const bH = block.offsetHeight || Math.round(bRect.height) || Math.min(parentInnerH, 200);

        const left = Math.max(0, Math.round((parentInnerW - bW) / 2));
        const top = Math.max(0, Math.round((parentInnerH - bH) / 2));

        block.style.left = left + 'px';
        block.style.top = top + 'px';
        block.style.transform = 'none';
      }

      centerByPixels();

      Array.from(block.querySelectorAll('img')).forEach(img => {
        if (!img.complete) img.addEventListener('load', centerByPixels, { once: true });
      });

    } catch (e) {
      try {
        block.style.left = '50%';
        block.style.top = '50%';
        block.style.transform = 'translate(-50%,-50%)';
      } catch (er) {}
    }
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

    if (data.cardSelector) cfg.cardSelector = data.cardSelector;
    if (data.radius) cfg.radius = data.radius;
    if (data.radiusFromParent !== undefined) cfg.radiusFromParent = data.radiusFromParent === 'true';
    if (data.radius && String(data.radius).trim().toLowerCase() === 'parent') cfg.radiusFromParent = true;

    if (data.rows) cfg.rows = Math.max(1, parseInt(data.rows, 10) || cfg.rows);
    if (data.rowGap) cfg.rowGap = parseFloat(data.rowGap) || cfg.rowGap;
    if (data.spacing) cfg.spacing = data.spacing;
    if (data.autoRotate !== undefined) cfg.autoRotate = data.autoRotate === 'true';
    if (data.rotateSpeed) cfg.rotateSpeed = parseFloat(data.rotateSpeed) || cfg.rotateSpeed;
    if (data.axis) cfg.axis = data.axis;
    if (data.perspective) cfg.perspective = parseInt(data.perspective, 10) || cfg.perspective;
    if (data.autoscale !== undefined) cfg.autoscale = data.autoscale === 'true';
    if (data.cardWidth) cfg.cardWidth = data.cardWidth;
    if (data.cardHeight) cfg.cardHeight = data.cardHeight;
    if (data.gap) cfg.gap = parseFloat(data.gap) || cfg.gap;
    if (data.inertia) cfg.inertia = Math.max(0, Math.min(1, parseFloat(data.inertia)));
    if (data.startAngle) cfg.startAngle = parseFloat(data.startAngle) || 0;
    if (data.easeMs) cfg.easeMs = parseInt(data.easeMs, 10) || cfg.easeMs;
    if (data.fillRows !== undefined) cfg.fillRows = data.fillRows === 'true';
    if (data.maxClonesPerRow) cfg.maxClonesPerRow = parseInt(data.maxClonesPerRow, 10) || cfg.maxClonesPerRow;

    if (data.uniformRadius !== undefined) cfg.uniformRadius = data.uniformRadius === 'true';
    if (data.rowShift !== undefined) cfg.rowShift = data.rowShift === 'true';
    if (data.rowShiftFactor !== undefined) {
      const f = parseFloat(data.rowShiftFactor);
      if (!isNaN(f)) cfg.rowShiftFactor = Math.max(0, Math.min(1, f));
    }

    if (data.wheelSpeed !== undefined) cfg.wheelSpeed = parseFloat(data.wheelSpeed) || cfg.wheelSpeed;
    if (data.wheelInvert !== undefined) cfg.wheelInvert = data.wheelInvert === 'true';
    if (data.wheelInertia !== undefined) cfg.wheelInertia = parseFloat(data.wheelInertia) || cfg.wheelInertia;

    if (data.scrollMode !== undefined) cfg.scrollMode = String(data.scrollMode || cfg.scrollMode);
    if (data.scrollSpeed !== undefined) cfg.scrollSpeed = parseFloat(data.scrollSpeed) || cfg.scrollSpeed;
    if (data.scrollInvert !== undefined) cfg.scrollInvert = data.scrollInvert === 'true';
    if (data.scrollInertia !== undefined) cfg.scrollInertia = parseFloat(data.scrollInertia) || cfg.scrollInertia;

    if (data.rotateX !== undefined) cfg.rotateX = parseFloat(data.rotateX) || 0;
    if (data.rotateY !== undefined) cfg.rotateY = parseFloat(data.rotateY) || 0;
    if (data.rotateZ !== undefined) cfg.rotateZ = parseFloat(data.rotateZ) || 0;

    let inner = block.querySelector('.omni-3d-inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'omni-3d-inner';
      inner.style.position = 'absolute';
      inner.style.inset = '0';
      inner.style.height = '100%';
      inner.style.transformStyle = 'preserve-3d';
      inner.style.webkitTransformStyle = 'preserve-3d';
      inner.style.display = 'flex';
      inner.style.alignItems = 'center';
      inner.style.justifyContent = 'center';
      inner.style.pointerEvents = 'none';
      block.insertBefore(inner, block.firstChild);
    }
    
    let allCandidates;
    try { allCandidates = Array.from(block.parentElement.querySelectorAll(cfg.cardSelector)); } catch (e) { allCandidates = []; }
    const candidatesToMove = allCandidates.filter(el => !inner.contains(el));

    candidatesToMove.forEach(el => {
      el.classList.add('omni-card--mounted');
      el.style.removeProperty('margin');
      el.style.position = 'absolute';
      el.style.top = '50%';
      el.style.left = '50%';
      el.style.transform = '';
      el.style.transformOrigin = 'center center';
      el.style.pointerEvents = 'auto';
      Array.from(el.querySelectorAll('img')).forEach(img => preventImageDrag(img));
      inner.appendChild(el);
    });

    Array.from(block.querySelectorAll(cfg.cardSelector)).forEach(el => {
      if (!inner.contains(el)) {
        el.classList.add('omni-card--mounted');
        el.style.removeProperty('margin');
        el.style.position = 'absolute';
        el.style.top = '50%';
        el.style.left = '50%';
        el.style.transform = '';
        el.style.transformOrigin = 'center center';
        el.style.pointerEvents = 'auto';
        Array.from(el.querySelectorAll('img')).forEach(img => preventImageDrag(img));
        inner.appendChild(el);
      }
    });

    const stage = inner;
    let cards = Array.from(stage.querySelectorAll(cfg.cardSelector));
    if (!stage || cards.length === 0) return;

    stage.addEventListener('dragstart', function(e) {
      if (e.target && e.target.tagName === 'IMG') e.preventDefault();
    }, true);

    Array.from(stage.querySelectorAll('.omni-3d-row')).forEach(r => {
      Array.from(r.children).forEach(ch => stage.appendChild(ch));
      r.remove();
    });

    cards = Array.from(stage.querySelectorAll(cfg.cardSelector));

    const rows = Math.max(1, cfg.rows);
    const rowsContainers = [];
    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'omni-3d-row';
      rowDiv.style.position = 'absolute';
      rowDiv.style.inset = '0';
      rowDiv.style.transformStyle = 'preserve-3d';
      rowDiv.style.pointerEvents = 'none';
      stage.appendChild(rowDiv);
      rowsContainers.push(rowDiv);
    }

    if (cards.length >= rows) {
      cards.forEach((card, idx) => {
        const rowIndex = idx % rows;
        rowsContainers[rowIndex].appendChild(card);
        card.classList.add('omni-card--mounted');
        card.style.width = '';
        card.style.height = '';
        card.style.transform = '';
        card.style.zIndex = '';
        card.style.opacity = '';
        Array.from(card.querySelectorAll('img')).forEach(img => preventImageDrag(img));
      });
    } else {
      cards.forEach((card, idx) => {
        rowsContainers[idx].appendChild(card);
        card.classList.add('omni-card--mounted');
        card.style.width = '';
        card.style.height = '';
        card.style.transform = '';
        card.style.zIndex = '';
        card.style.opacity = '';
        Array.from(card.querySelectorAll('img')).forEach(img => preventImageDrag(img));
      });
    }

    function computeSizes() {
      let rectRaw = block.getBoundingClientRect();

      // Safari/edge cases: если rect.height мал или 0 — пробуем offset/client/parent
      if (!rectRaw.height || rectRaw.height < 1) {
        const offsetH = block.offsetHeight || block.clientHeight || 0;
        if (offsetH > 0) {
          rectRaw = {
            width: block.offsetWidth || block.clientWidth || rectRaw.width || 800,
            height: offsetH,
            top: rectRaw.top,
            left: rectRaw.left,
            bottom: rectRaw.bottom,
            right: rectRaw.right
          };
        } else {
          const parent = block.parentElement;
          if (parent && parent !== document.body && parent !== document.documentElement) {
            const pRect = parent.getBoundingClientRect();
            if (pRect && pRect.height > 0) rectRaw = pRect;
          }
        }
      }

      if (!rectRaw.height || rectRaw.height < 1) {
        const cs = getComputedStyle(block);
        const ch = block.clientHeight || parseFloat(cs.height) || 420;
        const cw = block.clientWidth || parseFloat(cs.width) || 800;
        rectRaw = { width: cw, height: ch, top: rectRaw.top, left: rectRaw.left, bottom: rectRaw.bottom, right: rectRaw.right };
      }

      const rect = rectRaw;
      const minSide = Math.max(1, Math.min(rect.width, rect.height));

      let radiusPx = null;
      if (cfg.radiusFromParent) {
        try {
          const parent = block.parentElement;
          if (parent) {
            const pWidth = Math.max(1, parent.clientWidth || parent.getBoundingClientRect().width || rect.width);
            radiusPx = pWidth / 2;
          }
        } catch (e) {
          radiusPx = null;
        }
      }

      if (radiusPx === null) {
        const rSpec = parseUnit(cfg.radius);
        if (rSpec && rSpec.u === '%') radiusPx = minSide * (rSpec.v / 100);
        else if (rSpec && rSpec.u === 'px') radiusPx = rSpec.v;
        else radiusPx = (minSide * 0.35);
      }

      function cardSize(spec) {
        const p = parseUnit(spec);
        if (p && p.u === '%') return rect.width * (p.v / 100);
        else if (p && p.u === 'px') return p.v;
        return 200;
      }

      let cardW = cardSize(cfg.cardWidth);
      let cardH = cardSize(cfg.cardHeight);

      let scale = 1;
      if (cfg.autoscale) {
        const maxW = Math.max(1, rect.width * 0.9);
        const maxH = Math.max(1, rect.height * 0.9);
        scale = Math.min(1, Math.max(0.05, Math.min(maxW / Math.max(1, cardW), maxH / Math.max(1, cardH))));
        cardW = cardW * scale;
        cardH = cardH * scale;
      }

      return { radiusPx, cardW, cardH, rect };
    }

    function spacingToPx(spSpec, cardW) {
      const sp = parseUnit(spSpec);
      if (!sp) return 10;
      if (sp.u === 'px') return sp.v;
      if (sp.u === '%') return cardW * (sp.v / 100);
      return sp.v;
    }

    function ensureEachRowHasSource(rowsContainers) {
      /* ИЗМЕНЕНИЕ 2: Ищем источник только внутри текущего контейнера рядов */
      let sourceRow = rowsContainers.find(r => r.querySelectorAll(cfg.cardSelector).length > 0);
      if (!sourceRow) return;
      rowsContainers.forEach(rDiv => {
        const current = Array.from(rDiv.querySelectorAll(cfg.cardSelector));
        if (current.length === 0) {
          const src = sourceRow.querySelector(cfg.cardSelector);
          if (src) {
            const clone = src.cloneNode(true);
            clone.setAttribute('data-cloned', 'true');
            if (clone.id) clone.removeAttribute('id');
            if (clone.hasAttribute && clone.hasAttribute('tabindex')) clone.removeAttribute('tabindex');
            clone.classList.add('omni-card--mounted');
            clone.style.position = 'absolute';
            clone.style.top = '50%';
            clone.style.left = '50%';
            clone.style.margin = '0';
            clone.style.transform = '';
            clone.style.transformOrigin = 'center center';
            Array.from(clone.querySelectorAll('img')).forEach(img => preventImageDrag(img));
            rDiv.appendChild(clone);
          }
        }
      });
    }

    function ensureFillRows(radiusPx, cardW, cardH) {
      ensureEachRowHasSource(rowsContainers);

      rowsContainers.forEach((rDiv, rIdx) => {
        /* ИЗМЕНЕНИЕ 3: Считаем карточки только этого конкретного ряда */
        let current = Array.from(rDiv.querySelectorAll(cfg.cardSelector));
        if (current.length === 0) return;

        const centerRow = (rowsContainers.length - 1) / 2;
        const rowCenterOffset = (rIdx - centerRow);
        const verticalOffset = rowCenterOffset * (cardH * cfg.rowGap);

        let r_eff;
        if (cfg.uniformRadius) {
          r_eff = radiusPx;
        } else {
          r_eff = Math.sqrt(Math.max(0, radiusPx * radiusPx - verticalOffset * verticalOffset));
          if (!isFinite(r_eff) || r_eff < 1) r_eff = Math.max(10, radiusPx);
        }

        const spacingPx = Math.max(1, spacingToPx(cfg.spacing, cardW));
        const slot = cardW + spacingPx;
        const circ = 2 * Math.PI * r_eff;

        let desired = Math.max(current.length, Math.min(cfg.maxClonesPerRow, Math.round(circ / slot)));
        if (desired < current.length) desired = current.length;

        let i = 0;
        while (current.length < desired) {
          const src = current[i % current.length];
          const clone = src.cloneNode(true);
          clone.setAttribute('data-cloned', 'true');
          if (clone.id) clone.removeAttribute('id');
          if (clone.hasAttribute && clone.hasAttribute('tabindex')) clone.removeAttribute('tabindex');
          clone.classList.add('omni-card--mounted');
          clone.style.position = 'absolute';
          clone.style.top = '50%';
          clone.style.left = '50%';
          clone.style.margin = '0';
          clone.style.transform = '';
          clone.style.transformOrigin = 'center center';
          Array.from(clone.querySelectorAll('img')).forEach(img => preventImageDrag(img));
          rDiv.appendChild(clone);
          current.push(clone);
          i++;
          if (current.length > cfg.maxClonesPerRow) break;
        }
      });
    }

    function applyInnerRotation() {
      if (!inner) return;
      inner.style.transform = `rotateX(${cfg.rotateX}deg) rotateY(${cfg.rotateY}deg) rotateZ(${cfg.rotateZ}deg)`;
      inner.style.webkitTransform = inner.style.transform;
    }

    function positionCards() {
      const { radiusPx, cardW, cardH, rect } = computeSizes();
      const totalRows = rowsContainers.length;
      const centerRow = (totalRows - 1) / 2;

      applyInnerRotation();

      if (cfg.fillRows) ensureFillRows(radiusPx, cardW, cardH);

      rowsContainers.forEach((rDiv, rIdx) => {
        const rowCards = Array.from(rDiv.querySelectorAll(cfg.cardSelector));
        const m = Math.max(1, rowCards.length);
        const rowCenterOffset = (rIdx - centerRow);
        const verticalOffset = rowCenterOffset * (cardH * cfg.rowGap);

        let r_eff;
        if (cfg.uniformRadius) {
          r_eff = radiusPx;
        } else {
          r_eff = Math.sqrt(Math.max(0, radiusPx * radiusPx - verticalOffset * verticalOffset));
          if (!isFinite(r_eff) || r_eff < 1) r_eff = Math.max(10, radiusPx);
        }

        const spacingPx = Math.max(0.1, spacingToPx(cfg.spacing, cardW));
        const slot = cardW + spacingPx;

        let angularStepRad = (m > 1) ? (2 * Math.PI / m) : 0;
        if (m > 1) {
          const r_needed = slot / angularStepRad;
          if (r_eff < r_needed) {
            r_eff = Math.min(radiusPx * 2, r_needed);
          }
        } else {
          angularStepRad = 0;
        }
        const angularStepDeg = angularStepRad * 180 / Math.PI;

        const totalAngleOccupied = angularStepDeg * (m - 1);
        const angleOffsetForCenter = - totalAngleOccupied / 2;

        const rowShiftDeg = (cfg.rowShift && (rIdx % 2 === 1)) ? (angularStepDeg * cfg.rowShiftFactor) : 0;

        rowCards.forEach((card, i) => {
          const localT = (m === 1) ? 0 : angleOffsetForCenter + rowShiftDeg + i * angularStepDeg + cfg.gap;
          const theta = ((localT + angle) * Math.PI / 180);

          let transform3d;
          if (cfg.axis === 'y') {
            const x = Math.sin(theta) * r_eff;
            const z = Math.cos(theta) * r_eff;
            transform3d = `translate(-50%,-50%) translateX(${x}px) translateY(${verticalOffset}px) translateZ(${z}px) rotateY(${localT + angle}deg)`;
          } else if (cfg.axis === 'x') {
            const y = Math.sin(theta) * r_eff + verticalOffset;
            const z = Math.cos(theta) * r_eff;
            transform3d = `translate(-50%,-50%) translateY(${y}px) translateZ(${z}px) rotateX(${-(localT + angle)}deg)`;
          } else {
            const x = Math.cos(theta) * r_eff;
            const y = Math.sin(theta) * r_eff + verticalOffset;
            transform3d = `translate(-50%,-50%) translateX(${x}px) translateY(${y}px) rotateZ(${localT + angle}deg)`;
          }

          const zPos = Math.cos(theta) * r_eff;
          const depthFactor = (zPos / (r_eff || 1));
          const opacity = 0.45 + 0.55 * (depthFactor + 1) / 2;

            card.style.width = (Math.max(1, cardW)).toFixed(2) + 'px';
            card.style.height = (Math.max(1, cardH)).toFixed(2) + 'px';
            card.style.transform = transform3d + ` scale(1)`;
            card.style.zIndex = Math.round(1000 + zPos + rIdx * 10);
            card.style.opacity = opacity;
          card.classList.remove('omni-hidden');
          card.style.pointerEvents = 'auto';
        });
      });
    }

    let angle = cfg.startAngle;
    let velocity = 0;
    let lastTime = performance.now();
    let dragging = false;
    let lastX = 0;
    let lastScrollTop = (typeof window !== 'undefined') ? window.scrollY || document.documentElement.scrollTop : 0;

    function frame(now) {
      const dt = Math.min(40, now - lastTime);
      lastTime = now;

      if (cfg.scrollMode === 'window') {
        const currentScrollTop = (typeof window !== 'undefined') ? (window.scrollY || document.documentElement.scrollTop) : 0;
        const scrollDelta = currentScrollTop - lastScrollTop;
        if (scrollDelta !== 0) {
          let degFromScroll = scrollDelta * cfg.scrollSpeed;
          if (cfg.scrollInvert) degFromScroll *= -1;
          angle += degFromScroll;
          velocity = degFromScroll * (cfg.scrollInertia) * 60;
        }
        lastScrollTop = currentScrollTop;
      }

      if (cfg.autoRotate && !dragging) {
        angle += (cfg.rotateSpeed * dt / 1000);
      }

      if (Math.abs(velocity) > 0.001) {
        angle += velocity * dt / 16.666;
        velocity *= Math.pow(cfg.inertia, dt / 16.666);
        if (Math.abs(velocity) < 0.001) velocity = 0;
      }

      positionCards();
      requestAnimationFrame(frame);
    }

    lastTime = performance.now();
    requestAnimationFrame(frame);

    function onPointerDown(e) {
      dragging = true;
      velocity = 0;
      lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      block.setPointerCapture && typeof e.pointerId !== 'undefined' && block.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e) {
      if (!dragging) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const dx = x - lastX;
      lastX = x;
      const rect = block.getBoundingClientRect();
      const degPerPx = 180 / rect.width * 0.8;
      angle += dx * degPerPx;
      velocity = dx * degPerPx * 0.9;
    }
    function onPointerUp() { dragging = false; }

    block.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    block.addEventListener('wheel', (ev) => {
      let raw = ev.deltaY;
      if (ev.deltaMode === 1) raw *= 16;
      else if (ev.deltaMode === 2) raw *= window.innerHeight;
      let degChange = -raw * cfg.wheelSpeed * 0.02;
      if (cfg.wheelInvert) degChange *= -1;
      angle += degChange;
      velocity = degChange * (cfg.wheelInertia) * 60;
    }, { passive: false });

    block.tabIndex = 0;
    block.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') angle -= 12;
      if (e.key === 'ArrowRight') angle += 12;
      if (e.key === 'Home') angle = cfg.startAngle;
    });

    block.omni3d = {
      next() {
        const counts = rowsContainers.map(r => r.querySelectorAll(cfg.cardSelector).length);
        const avg = Math.max(1, Math.round(counts.reduce((a,b)=>a+b,0)/counts.length));
        angle += 360 / avg;
      },
      prev() {
        const counts = rowsContainers.map(r => r.querySelectorAll(cfg.cardSelector).length);
        const avg = Math.max(1, Math.round(counts.reduce((a,b)=>a+b,0)/counts.length));
        angle -= 360 / avg;
      },
      goTo(i) {
        const counts = rowsContainers.map(r => r.querySelectorAll(cfg.cardSelector).length);
        const avg = Math.max(1, Math.round(counts.reduce((a,b)=>a+b,0)/counts.length));
        angle = - (360 / avg) * i;
      },
      setRotation(x, y, z) {
        if (typeof x === 'number') cfg.rotateX = x;
        if (typeof y === 'number') cfg.rotateY = y;
        if (typeof z === 'number') cfg.rotateZ = z;
        applyInnerRotation();
      },
      getRotation() {
        return { x: cfg.rotateX, y: cfg.rotateY, z: cfg.rotateZ };
      },
      setWheelConfig(speed, invert, inertia) {
        if (typeof speed === 'number') cfg.wheelSpeed = speed;
        if (typeof invert === 'boolean') cfg.wheelInvert = invert;
        if (typeof inertia === 'number') cfg.wheelInertia = inertia;
      },
      getWheelConfig() {
        return { speed: cfg.wheelSpeed, invert: cfg.wheelInvert, inertia: cfg.wheelInertia };
      },
      setScrollConfig(mode, speed, invert, inertia) {
        if (typeof mode === 'string') cfg.scrollMode = mode;
        if (typeof speed === 'number') cfg.scrollSpeed = speed;
        if (typeof invert === 'boolean') cfg.scrollInvert = invert;
        if (typeof inertia === 'number') cfg.scrollInertia = inertia;
      },
      getScrollConfig() {
        return { mode: cfg.scrollMode, speed: cfg.scrollSpeed, invert: cfg.scrollInvert, inertia: cfg.scrollInertia };
      },
      destroy() {
        try { block.removeEventListener('pointerdown', onPointerDown); } catch(e){}
        try { window.removeEventListener('pointermove', onPointerMove); } catch(e){}
        try { window.removeEventListener('pointerup', onPointerUp); } catch(e){}
      }
    };

    applyInnerRotation();
    positionCards();
  }

  function initAll() {
    const nodes = document.querySelectorAll('.omni-3d-carousel');
    nodes.forEach(n => initCarousel(n));
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initAll);
  else
    initAll();


})();
