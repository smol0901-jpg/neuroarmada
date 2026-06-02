/**
 * Main - Точка входа приложения
 */


import { Game } from './core/game.js';
import { StorageManager } from './core/storage.js';
import { InputManager } from './utils/input.js';

class App {
  constructor() {
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
    this.storage.load();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.setupInput();
    this.setupButtons();
    
    this.game.startLevel(this.storage.data.progress.currentLevel);
    
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
    }, 500);
    
    this.start();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.ctx.scale(dpr, dpr);
    this.game.resize(width, height);
  }

  setupInput() {
    this.input.on('tap', ({ x, y }) => {
      this.game.onInput(x, y);
    });
    
    this.input.on('swipe', ({ x, y, direction }) => {
      // Можно использовать для свайпа плиток
    });
    
    this.input.on('reset', () => {
      this.game.reset();
    });
    
    this.input.on('hint', () => {
      this.game.showHint();
    });
  }


  setupButtons() {
    const soundBtn = document.getElementById('soundBtn');
    soundBtn.addEventListener('click', () => {
      const enabled = !this.storage.getSetting('sound');
      this.storage.setSetting('sound', enabled);
      soundBtn.textContent = enabled ? '🔊' : '🔇';
      soundBtn.classList.toggle('muted', !enabled);
    });
    
    const musicBtn = document.getElementById('musicBtn');
    musicBtn.addEventListener('click', () => {
      const enabled = !this.storage.getSetting('music');
      this.storage.setSetting('music', enabled);
      musicBtn.textContent = enabled ? '🎵' : '🔇';
      musicBtn.classList.toggle('muted', !enabled);
    });
    
    document.getElementById('hintBtn').addEventListener('click', () => this.game.showHint());
    document.getElementById('addBtn').addEventListener('click', () => this.game.addTiles());
    document.getElementById('resetBtn').addEventListener('click', () => this.game.reset());
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettingsModal();
    });
  }

  showSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>⚙️ Настройки</h2>
        <div class="setting-row">
          <span>🔊 Звук</span>
          <button id="toggleSound">${this.storage.getSetting('sound') ? 'Вкл' : 'Выкл'}</button>
        </div>
        <div class="setting-row">
          <span>🎵 Музыка</span>
          <button id="toggleMusic">${this.storage.getSetting('music') ? 'Вкл' : 'Выкл'}</button>
        </div>
        <div class="setting-row">
          <span>📊 Статистика</span>
        </div>
        <div class="stats">
          <p>Игр сыграно: ${this.storage.data.player.gamesPlayed}</p>
          <p>Рекорд: ${this.storage.data.player.highScore}</p>
          <p>Уровней пройдено: ${this.storage.data.player.levelsCompleted}</p>
        </div>
        <button class="close-btn" id="closeModal">Закрыть</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeModal').onclick = () => modal.remove();
    document.getElementById('toggleSound').onclick = () => {
      const enabled = !this.storage.getSetting('sound');
      this.storage.setSetting('sound', enabled);
      document.getElementById('toggleSound').textContent = enabled ? 'Вкл' : 'Выкл';
    };
    document.getElementById('toggleMusic').onclick = () => {
      const enabled = !this.storage.getSetting('music');
      this.storage.setSetting('music', enabled);
      document.getElementById('toggleMusic').textContent = enabled ? 'Вкл' : 'Выкл';
    };
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    
    this.ctx.fillStyle = '#0f0f1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.game.update(dt);
    this.game.render();
    
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => new App());