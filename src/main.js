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
    this.audioStarted = false;
    
    this.init();
  }

  init() {
    console.log('App init');
    
    this.storage.load();
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.game.startLevel(this.storage.data.progress.currentLevel);
    
    console.log('Level started, grid:', this.game.board.grid);
    
    this.setupInput();
    this.setupButtons();
    this.setupSettings();
    this.setupStartOverlay();
    
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

  setupStartOverlay() {
    const overlay = document.getElementById('startOverlay');
    const startBtn = document.getElementById('startBtn');
    
    const startGame = () => {
      if (this.audioStarted) return;
      this.audioStarted = true;
      
      this.game.initAudio();
      
      overlay.classList.add('hidden');
    };
    
    startBtn.addEventListener('click', startGame);
    startBtn.addEventListener('touchstart', startGame);
    overlay.addEventListener('click', startGame);
  }

  setupInput() {
    this.input.on('tap', ({ x, y }) => {
      this.game.onInput(x, y, 'tap');
    });
    
    this.input.on('swipe', ({ x, y, direction, dx, dy }) => {
      this.game.onInput(x, y, 'swipe');
    });
    
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

  setupSettings() {
    const soundToggle = document.getElementById('soundToggle');
    const musicToggle = document.getElementById('musicToggle');
    const tapMode = document.getElementById('tapMode');
    const dragMode = document.getElementById('dragMode');
    const closeSettings = document.getElementById('closeSettings');
    
    const soundEnabled = this.storage.getSetting('sound');
    const musicEnabled = this.storage.getSetting('music');
    const controlMode = this.storage.getSetting('controlMode') || 'tap';
    
    soundToggle.classList.toggle('on', soundEnabled !== false);
    musicToggle.classList.toggle('on', musicEnabled !== false);
    tapMode.classList.toggle('active', controlMode === 'tap');
    dragMode.classList.toggle('active', controlMode === 'drag');
    
    soundToggle.addEventListener('click', () => {
      soundToggle.classList.toggle('on');
      this.storage.setSetting('sound', soundToggle.classList.contains('on'));
      this.toggleSound();
    });
    
    musicToggle.addEventListener('click', () => {
      musicToggle.classList.toggle('on');
      this.storage.setSetting('music', musicToggle.classList.contains('on'));
      this.toggleMusic();
    });
    
    tapMode.addEventListener('click', () => {
      tapMode.classList.add('active');
      dragMode.classList.remove('active');
      this.storage.setSetting('controlMode', 'tap');
      this.input.setMode('tap');
    });
    
    dragMode.addEventListener('click', () => {
      dragMode.classList.add('active');
      tapMode.classList.remove('active');
      this.storage.setSetting('controlMode', 'drag');
      this.input.setMode('drag');
    });
    
    closeSettings.addEventListener('click', () => {
      document.getElementById('settingsModal').classList.remove('show');
    });
  }

  toggleSound() {
    const enabled = this.storage.getSetting('sound');
    this.game.audio.setEnabled(enabled !== false);
    const soundBtn = document.getElementById('soundBtn');
    if (enabled === false) {
      soundBtn.classList.add('muted');
    } else {
      soundBtn.classList.remove('muted');
    }
  }

  toggleMusic() {
    const enabled = this.storage.getSetting('music');
    this.game.audio.setMusicEnabled(enabled !== false);
    const musicBtn = document.getElementById('musicBtn');
    if (enabled === false) {
      musicBtn.classList.add('muted');
    } else {
      musicBtn.classList.remove('muted');
    }
  }

  showSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
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
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.game.update(dt);
    
    this.game.render(this.ctx);
    
    requestAnimationFrame(() => this.loop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  window.app = new App();
});
