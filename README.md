# 🐯 Нейроармада

Match-3 игра с тигрятами. Современный UI/UX, Web Audio, частицы, Web Worker.

## 🎮 Играть

**Ссылка:** https://neuroarmada.vercel.app

## Структура проекта

```
neuroarmada/
├── index.html          # Главная страница
├── src/
│   ├── main.js         # Точка входа
│   ├── config.js      # Конфигурация
│   ├── core/
│   │   ├── game.js    # Главный класс игры
│   │   ├── board.js   # Менеджер поля
│   │   ├── match.js   # Поиск совпадений
│   │   └── storage.js # Сохранение
│   ├── systems/
│   │   ├── audio/    # AudioManager
│   │   └── particles/ # ParticleSystem
│   ├── utils/
│   │   ├── input.js  # Управление вводом
│   │   ├── tiger.js  # Рендер тигрят
│   │   └── eventemitter.js
│   └── workers/
│       └── matchWorker.js # Web Worker
├── assets/
│   └── audio/         # Звуковые файлы
└── vercel.json        # Конфиг Vercel
```

## 🔊 Звуковые файлы

Создай папку `assets/audio/` и добавь туда файлы:

**SFX (эффекты):**
- `click.mp3` - клик по кнопке
- `select.mp3` - выбор плитки
- `match.mp3` - совпадение
- `error.mp3` - ошибка
- `win.mp3` - победа
- `shuffle.mp3` - перемешивание
- `combo.mp3` - комбо

**BGM (фоновая музыка):**
- `bgm1.mp3`
- `bgm2.mp3`
- `bgm3.mp3`
- `bgm4.mp3`

Формат: MP3, OGG или WAV. Программа сама загрузит файлы из папки. Если файлов нет - используется синтез.

## 🕹 Управление

- **Тап/клик** - выбрать плитку
- **Свайп/drag** - поменять плитки
- **R** - сброс уровня
- **H** - подсказка
- **M** - вкл/выкл музыку
- **S** - вкл/выкл звук

## 🚀 Деплой


### Vercel (рекомендуется)
1. Подключи репозиторий к Vercel
2. Build command: оставить пустым
3. Output directory: оставить пустым
4. Deploy

### GitHub Pages
1. Settings → Pages → Source: main branch
2. Worker путь изменится на `/neuroarmada/src/workers/...`

## 🔧 Разработка

```bash
# Локально
npx serve .
# или
python -m http.server 8000
```

## Что сделано

- [x] Модульная архитектура
- [x] Canvas рендеринг
- [x] Web Worker для расчётов
- [x] Система частиц
- [x] Web Audio (синтез + файлы)
- [x] Touch/Mouse/Keyboard ввод
- [x] Свайпы
- [x] Сохранение прогресса
- [x] Полированный UI
- [x] Адаптивность
- [x] Vercel готов

## TODO

- [ ] Добавить звуковые файлы
- [ ] Проверить на мобильных
- [ ] Добавить больше уровней
- [ ] Таблица лидеров