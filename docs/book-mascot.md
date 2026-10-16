# Книжечка редакции

Оригинальный персонаж для сайта. Создан встроенной генерацией изображений, прозрачный PNG: `assets/book-mascot.png`. Используется рядом с названием клуба и как иконка вкладки.

Итоговый запрос:

> A single original adorable little closed hardcover book character, front-facing, a cream page block along its right edge, two dark square eyes, a happy pixel smile, short stubby feet and one arm waving. Crisp square-grid pixel-art sprite aesthetic. Muted sage and forest green cover, warm ivory pages, green-charcoal outline, soft pink cheeks. Full body, centered, transparent background, readable at a small website size. No Claude logo, starburst, asterisk, orange crab, text, watermark, props or background.

## Небольшая анимация

`assets/book-mascot-blink.png` — дополнительный кадр с закрытыми глазами. Создан встроенной генерацией изображений с исходным PNG как редактируемым изображением. Запрос:

> Use case: precise-object-edit. Edit target: the supplied transparent PNG of our green pixel-art book mascot. Make exactly ONE change: CLOSE BOTH EYES for a single blinking animation frame. Replace each open eye with a short horizontal dark pixel line, as a friendly relaxed blink. Preserve the original mascot exactly everywhere else: same book, pose, smiling mouth, cheeks, cover decoration, waving arm, feet, silhouette, colors, texture, crisp square pixels, scale, position and 1280x1280 square canvas. Do not move, reshape, redraw or crop any other part. This will alternate with the original in a GIF, so canvas registration and unchanged silhouette are essential. Background must remain genuinely transparent. No extra objects, text, borders, shadows or backdrop.

`scripts/animate-mascot.py` собирает оба изображения в прозрачный GIF 128×128: плавное по времени смещение на 1–2 пикселя и моргание на 120 мс один раз за цикл. Общая длительность цикла 6,9 с. Палитра единая для всех кадров, масштабирование без сглаживания. Исходные PNG остаются неизменными.

Повторная сборка: `python3 scripts/animate-mascot.py`, требуется Pillow. Для обычной сборки сайта эта зависимость не нужна: готовый GIF хранится в репозитории.

Элемент `picture` включает GIF только при `prefers-reduced-motion: no-preference`. При уменьшении движения остаётся исходный статичный PNG. Иконка вкладки всегда статична.
