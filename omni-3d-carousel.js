(function() {
    'use strict';

    function initOmni() {
        const stage = document.querySelector('.omni-3d-carousel');
        const sourceCards = document.querySelectorAll('.omni-card');
        if (!stage || sourceCards.length === 0) return;

        // Настройки сцены
        const rows = 3;
        const cardsPerLayer = 5;
        const radius = 280;
        const cardW = 150;
        const cardH = 150;

        // 1. Очистка и подготовка контейнера
        stage.style.cssText = 'position:relative !important; width:100% !important; height:600px !important; perspective:1200px !important; overflow:visible !important;';
        const scene = document.createElement('div');
        scene.style.cssText = 'position:absolute; inset:0; transform-style:preserve-3d; pointer-events:none;';
        stage.appendChild(scene);

        // 2. Клонирование и принудительная стилизация
        let totalNeeded = rows * cardsPerLayer;
        let allCards = [];

        for (let i = 0; i < totalNeeded; i++) {
            let source = sourceCards[i % sourceCards.length];
            let clone = source.cloneNode(true);
            
            // Жестко забиваем стили, чтобы Tilda не могла их изменить
            clone.style.cssText = `
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                width: ${cardW}px !important;
                height: ${cardH}px !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
                visibility: visible !important;
                pointer-events: auto !important;
                transform-style: preserve-3d !important;
                backface-visibility: hidden !important;
                opacity: 1 !important;
            `;
            scene.appendChild(clone);
            allCards.push(clone);
        }

        // 3. Расстановка по кругу и рядам
        allCards.forEach((card, i) => {
            const row = Math.floor(i / cardsPerLayer);
            const col = i % cardsPerLayer;
            const angle = col * (360 / cardsPerLayer);
            const y = (row - (rows - 1) / 2) * (cardH * 1.2);

            card.style.setProperty('transform', `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px) translateY(${y}px)`, 'important');
        });

        // 4. Скрытие оригиналов, которые остались в столбике
        sourceCards.forEach(c => c.style.display = 'none');

        // 5. Вращение
        let rotation = 0;
        function animate() {
            rotation -= 0.2;
            scene.style.transform = `rotateY(${rotation}deg)`;
            requestAnimationFrame(animate);
        }
        animate();
    }

    // Инъекция CSS для подавления столбика Tilda до загрузки
    const style = document.createElement('style');
    style.innerHTML = '.omni-card:not(.omni-scene .omni-card) { opacity: 0 !important; position: absolute !important; }';
    document.head.appendChild(style);

    // Ожидание появления элементов
    const checkExist = setInterval(function() {
       if (document.querySelectorAll('.omni-card').length > 0) {
          initOmni();
          clearInterval(checkExist);
       }
    }, 100);
})();
