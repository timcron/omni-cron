(function() {
    'use strict';

    const DEFAULTS = {
        cardSelector: '.omni-card',
        radius: 250,
        rows: 3,
        rowGap: 1.2,
        rotateSpeed: 6,
        cardWidth: 150,
        cardHeight: 150
    };

    function initOmni() {
        const stage = document.querySelector('.omni-3d-carousel');
        const cards = document.querySelectorAll(DEFAULTS.cardSelector);

        if (!stage || cards.length === 0) return;

        // Принудительно очищаем и готовим сцену
        stage.style.cssText = 'position:relative !important; width:100% !important; height:600px !important; perspective:1200px !important; overflow:visible !important;';
        
        const scene = document.createElement('div');
        scene.style.cssText = 'position:absolute; inset:0; transform-style:preserve-3d; display:flex; align-items:center; justify-content:center; pointer-events:none; will-change:transform;';
        stage.appendChild(scene);

        // Распределяем карточки
        const cardsPerRow = Math.ceil(cards.length / DEFAULTS.rows);
        const angleStep = 360 / cardsPerRow;

        cards.forEach((card, i) => {
            const row = i % DEFAULTS.rows;
            const col = Math.floor(i / DEFAULTS.rows);
            const angle = col * angleStep;
            const yOffset = (row - (DEFAULTS.rows - 1) / 2) * (DEFAULTS.cardHeight * DEFAULTS.rowGap);

            // Полная блокировка стилей Tilda для карточки
            card.style.cssText = `
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                width: ${DEFAULTS.cardWidth}px !important;
                height: ${DEFAULTS.cardHeight}px !important;
                margin: 0 !important;
                pointer-events: auto !important;
                transform-style: preserve-3d !important;
                backface-visibility: hidden !important;
                transform: translate(-50%, -50%) rotateY(${angle}deg) translateZ(${DEFAULTS.radius}px) translateY(${yOffset}px) !important;
            `;
            scene.appendChild(card);
        });

        // Плавное вращение
        let rotation = 0;
        function animate() {
            rotation -= (DEFAULTS.rotateSpeed / 60);
            scene.style.transform = `rotateY(${rotation}deg)`;
            requestAnimationFrame(animate);
        }
        animate();
    }

    // Запуск после полной отрисовки страницы
    if (document.readyState === 'complete') {
        setTimeout(initOmni, 500);
    } else {
        window.addEventListener('load', () => setTimeout(initOmni, 500));
    }
})();
