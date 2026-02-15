(function() {
    'use strict';

    function initOmni() {
        const stage = document.querySelector('.omni-3d-carousel');
        // Ищем карточки не только по классу, но и внутри родительских контейнеров Tilda
        const cards = document.querySelectorAll('.omni-card');

        if (!stage || cards.length === 0) return;

        // 1. Очистка контейнера
        stage.style.cssText = 'position:relative !important; width:100% !important; height:600px !important; perspective:1200px !important; overflow:visible !important;';
        
        // 2. Создание сцены
        const scene = document.createElement('div');
        scene.className = 'omni-scene';
        scene.style.cssText = 'position:absolute; inset:0; transform-style:preserve-3d; display:flex; align-items:center; justify-content:center; pointer-events:none;';
        stage.appendChild(scene);

        // 3. Параметры из атрибутов или дефолтные
        const radius = parseInt(stage.dataset.radius) || 280;
        const rows = parseInt(stage.dataset.rows) || 3;
        const cardH = 150;

        // 4. Расстановка с обходом ограничений Tilda
        cards.forEach((card, i) => {
            const row = i % rows;
            const col = Math.floor(i / rows);
            const angle = col * (360 / Math.ceil(cards.length / rows));
            const y = (row - (rows - 1) / 2) * (cardH * 1.1);

            // Форсируем стили через JS, перебивая CSS Tilda
            card.style.setProperty('position', 'absolute', 'important');
            card.style.setProperty('top', '50%', 'important');
            card.style.setProperty('left', '50%', 'important');
            card.style.setProperty('width', '150px', 'important');
            card.style.setProperty('height', '150px', 'important');
            card.style.setProperty('margin', '0', 'important');
            card.style.setProperty('transform-style', 'preserve-3d', 'important');
            card.style.setProperty('transform', `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px) translateY(${y}px)`, 'important');
            card.style.setProperty('visibility', 'visible', 'important');
            card.style.setProperty('display', 'block', 'important');
            
            scene.appendChild(card);
        });

        // 5. Анимация
        let rotation = 0;
        function animate() {
            rotation -= 0.1;
            scene.style.transform = `rotateY(${rotation}deg)`;
            requestAnimationFrame(animate);
        }
        animate();
        console.log("OMNI CRON: Gallery Initialized");
    }

    // МЕХАНИЗМ ОЖИДАНИЯ: Проверяем наличие элементов каждые 100мс
    const checkExist = setInterval(function() {
       if (document.querySelectorAll('.omni-card').length > 0) {
          initOmni();
          clearInterval(checkExist);
       }
    }, 100);
})();
