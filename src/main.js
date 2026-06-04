/**
 * Main - Точка входа приложения
 */

import { Game } from './core/game.js';
import { StorageManager } from './core/storage.js';
import { InputManager } from './utils/input.js';

class App {
  constructor() {
    console.log('App constructor');
    
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.storage = new StorageManager();
    this.game = new Game(this.ctx, this.storage);
    this.input = new InputManager(this.canvas);
    
    this.lastTime = 0;
    this.isRunning = false;
    
    this.init();
  }

  init() {
    console.log('App init');
    
    this.storage.load();
    
    // Сначала resize
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Потом генерация поля
    this.game.startLevel(this.storage.data.progress.currentLevel);
    
    console.log('Level started, grid:', this.game.board.grid);
    
    this.setupInput();
    this.setupButtons();
    
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
    }, 500);
    
    this.start();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    console.log('Resize:', width, height);
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.ctx.scale(dpr, dpr);
    this.game.resize(width, height);
  }

  setupInput() {
    // Тап (клик)
    this.input.on('tap', ({ x, y }) => {
      this.game.onInput(x, y, 'tap');
    });
    
    // Свайп
    this.input.on('swipe', ({ x, y, direction, dx, dy }) => {
      this.game.onInput(x, y, 'swipe');
    });
    
    // Клавиши
    this.input.on('reset', () => {
      this.game.reset();
    });
    
    this.input.on('hint', () => {
      this.game.showHint();
    });
    
    this.input.on('music', () => {
      this.toggleMusic();
    });
    
    this.input.on('sound', () => {
      this.toggleSound();
    });
  }

  setupButtons() {
    const soundBtn = document.getElementById('soundBtn');
    soundBtn.addEventListener('click', () => this.toggleSound());
    
    const musicBtn = document.getElementById('musicBtn');
    musicBtn.addEventListener('click', () => this.toggleMusic());
    
    document.getElementById('hintBtn').addEventListener('click', () => this.game.showHint());
    document.getElementById('addBtn').addEventListener('click', () => this.game.addTiles());
    document.getElementById('resetBtn').addEventListener('click', () => this.game.reset());
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal());
  }

  toggleSound() {
    const enabled = !this.storage.getSetting('sound');
    this.storage.setSetting('sound', enabled);
    const soundBtn = document.getElementById('soundBtn');
    if (enabled) {
      soundBtn.classList.remove('muted');
    } else {
      soundBtn.classList.add('muted');
    }
  }

  toggleMusic() {
    const enabled = !this.storage.getSetting('music');
    this.storage.setSetting('music', enabled);
    const musicBtn = document.getElementById('musicBtn');
    if (enabled) {
      musicBtn.classList.remove('muted');
    } else {
      musicBtn.classList.add('muted');
    }
  }

  showSettingsModal() {
    // Показ модального окна настроек
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  loop() {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Очистка
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Обновление
    this.game.update(dt);
    
    // Рендер
    this.game.render(this.ctx);
    
    requestAnimationFrame(() => this.loop());
  }
}

// Запуск
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  window.app = new App();
});