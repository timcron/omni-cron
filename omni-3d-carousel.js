(function() {
    'use strict';

    function initOmni() {
        const stage = document.querySelector('.omni-3d-carousel');
        const sourceCards = document.querySelectorAll('.omni-card');

        if (!stage || sourceCards.length === 0) return;

        // 1. Настройки сцены
        const rows = parseInt(stage.dataset.rows) || 3;
        const radius = parseInt(stage.dataset.radius) || 250;
        const cardW = 150;
        const cardH = 150;
        const cardsPerLayer = 5; // Сколько штук должно быть в одном ряду

        stage.style.cssText = 'position:relative !important; width:100% !important; height:600px !important; perspective:1200px !important; overflow:visible !important;';
        
        const scene = document.createElement('div');
        scene.style.cssText = 'position:absolute; inset:0; transform-style:preserve-3d; pointer-events:none;';
        stage.appendChild(scene);

        // 2. Логика заполнения: размножаем имеющиеся 3 картинки до 15 (3 ряда по 5)
        let totalNeeded = rows * cardsPerLayer;
        let allCards = [];

        for (let i = 0; i < totalNeeded; i++) {
            // Берем оригинал по кругу (0, 1, 2, 0, 1, 2...)
            let source = sourceCards[i % sourceCards.length];
            let clone = source.cloneNode(true);
            
            // Очищаем стили Tilda и накладываем свои
            clone.style.cssText = `
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                width: ${cardW}px !important;
                height: ${cardH}px !important;
                margin: 0 !important;
                pointer-events: auto !important;
                transform-style: preserve-3d !important;
                backface-visibility: hidden !important;
                display: block !important;
                visibility: visible !important;
            `;
            scene.appendChild(clone);
            allCards.push(clone);
        }

        // 3. Расстановка в 3D
        const angleStep = 360 / cardsPerLayer;

        allCards.forEach((card, i) => {
            const row = Math.floor(i / cardsPerLayer);
            const col = i % cardsPerLayer;
            const angle = col * angleStep;
            const y = (row - (rows - 1) / 2) * (cardH * 1.1);

            card.style.transform = `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px) translateY(${y}px)`;
        });

        // 4. Анимация
        let rotation = 0;
        function animate() {
            rotation -= 0.2;
            scene.style.transform = `rotateY(${rotation}deg)`;
            requestAnimationFrame(animate);
        }
        animate();
    }

    // Ждем появления карточек
    const checkExist = setInterval(function() {
       if (document.querySelectorAll('.omni-card').length > 0) {
          initOmni();
          clearInterval(checkExist);
       }
    }, 100);
})();
