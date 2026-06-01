/**
 * Main - Точка входа приложения
 */

import { Game } from './core/game.js';
import { StorageManager } from './core/storage.js';

class App {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.storage = new StorageManager();
    this.game = new Game(this.ctx, this.storage);
    
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
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.ctx.scale(dpr, dpr);
    this.game.resize(width, height);
  }

  setupInput() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.game.onInput(x, y);
    });
    
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.game.onInput(x, y);
    }, { passive: false });
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
    document.getElementById('settingsBtn').addEventListener('click', () => {});
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.ctx.fillStyle = '#0f0f1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.game.update(dt);
    this.game.render();
    
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => new App());