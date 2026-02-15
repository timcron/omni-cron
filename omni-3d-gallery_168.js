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

  function initCarousel(block) {
    const data = block.dataset;
    const cfg = Object.assign({}, OMNI_3D_DEFAULTS);
    
    // Читаем настройки из data-атрибутов
    if (data.rows) cfg.rows = parseInt(data.rows);
    if (data.radius) cfg.radius = data.radius;

    let inner = block.querySelector('.omni-3d-inner') || document.createElement('div');
    inner.className = 'omni-3d-inner';
    inner.style.cssText = 'position:absolute; inset:0; transform-style:preserve-3d; display:flex; align-items:center; justify-content:center;';
    if (!inner.parentElement) block.insertBefore(inner, block.firstChild);

    // Собираем карточки
    let cards = Array.from(document.querySelectorAll(cfg.cardSelector));
    
    // Клонируем, если их мало (нужно минимум 5 на ряд, итого 15)
    const targetCount = cfg.rows * 5;
    while (cards.length < targetCount && cards.length > 0) {
      let clone = cards[cards.length % 3].cloneNode(true);
      document.body.appendChild(clone); // Временно в body
      cards.push(clone);
    }

    cards.forEach(el => {
      el.classList.add('omni-card--mounted');
      // ОЧИСТКА: Удаляем инлайновые стили Tilda (top, left, transform)
      el.style.top = '50%';
      el.style.left = '50%';
      inner.appendChild(el);
    });

    let angle = 0;
    const radiusPx = 280; 

    function positionCards() {
      const cardsPerRow = Math.ceil(cards.length / cfg.rows);
      const step = 360 / cardsPerRow;

      cards.forEach((card, i) => {
        const row = i % cfg.rows;
        const col = Math.floor(i / cfg.rows);
        const theta = (angle + (col * step)) * Math.PI / 180;
        
        const x = Math.sin(theta) * radiusPx;
        const z = Math.cos(theta) * radiusPx;
        const y = (row - (cfg.rows - 1) / 2) * 170; // 170 - это высота + отступ

        card.style.setProperty('transform', `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) translateZ(${z}px) rotateY(${angle + (col * step)}deg)`, 'important');
        card.style.opacity = (z / radiusPx + 1.2) / 2;
        card.style.zIndex = Math.round(1000 + z);
      });
    }

    function animate() {
      angle -= 0.2;
      positionCards();
      requestAnimationFrame(animate);
    }
    animate();
  }

  // Запуск с гарантированным ожиданием отрисовки Zero Block
  setTimeout(() => {
    document.querySelectorAll('.omni-3d-carousel').forEach(initCarousel);
  }, 500);
})();