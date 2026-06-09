/**
 * AudioManager - Управление звуком и музыкой
 * Синтез звуков + поддержка файлов
 */

import { EventEmitter } from '../../utils/eventemitter.js';

const BASE_PATH = '';

export class AudioManager extends EventEmitter {
  constructor() {
    super();
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.isPlaying = false;
    
    this.buffers = {};
    this.activeSources = {};
    
    this.soundFiles = {
      click: 'click.mp3',
      match: 'match.mp3',
      error: 'error.mp3',
      win: 'win.mp3',
      shuffle: 'shuffle.mp3',
      select: 'select.mp3',
      combo: 'combo.mp3',
      bonus: 'bonus.mp3'
    };
    
    this.bgmFiles = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3'];
    this.currentBgmIndex = 0;
  }

  init() {
    if (this.ctx) return;
    
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      
      this.sfxGain.gain.value = 0.4;
      this.bgmGain.gain.value = 0.15;
      
      this.sfxGain.connect(this.masterGain);
      this.bgmGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      
      this.masterGain.gain.value = 1;
      
      console.log('Audio initialized');
    } catch (e) {
      console.error('Audio init failed:', e);
    }
  }

  async loadSounds() {
    if (!this.ctx) return;
    
    const basePath = BASE_PATH + 'assets/audio/';
    
    for (const [key, filename] of Object.entries(this.soundFiles)) {
      try {
        const response = await fetch(basePath + filename);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.buffers[key] = audioBuffer;
        }
      } catch (e) {
        console.log(`Sound ${filename} not found, using synthesis`);
      }
    }
    
    for (const filename of this.bgmFiles) {
      try {
        const response = await fetch(basePath + filename);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.buffers['bgm_' + filename.replace('.mp3', '')] = audioBuffer;
        }
      } catch (e) {
        console.log(`BGM ${filename} not found`);
      }
    }
  }

  playSound(key) {
    if (!this.ctx || (key !== 'bgm' && !this.enabled)) return;
    
    if (this.buffers[key]) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[key];
      
      const gain = key === 'bgm' ? this.bgmGain : this.sfxGain;
      source.connect(gain);
      source.start();
      
      if (key !== 'bgm') {
        source.onended = () => source.disconnect();
      }
      
      return source;
    }
    
    this.playSynthesis(key);
  }

  playSynthesis(key) {
    if (!this.ctx) return;
    
    switch (key) {
      case 'click':
        this.playTone(800, 0.1, 'sine');
        break;
      case 'select':
        this.playTone(600, 0.08, 'sine');
        break;
      case 'match':
        this.playTone(523, 0.15, 'sine');
        setTimeout(() => this.playTone(659, 0.15, 'sine'), 50);
        setTimeout(() => this.playTone(784, 0.2, 'sine'), 100);
        break;
      case 'error':
        this.playTone(200, 0.3, 'sawtooth');
        break;
      case 'win':
        const notes = [523, 659, 784, 1047];
        notes.forEach((n, i) => setTimeout(() => this.playTone(n, 0.3, 'sine'), i * 100));
        break;
      case 'shuffle':
        for (let i = 0; i < 5; i++) {
          setTimeout(() => this.playTone(300 + Math.random() * 500, 0.1, 'square'), i * 50);
        }
        break;
      case 'combo':
        this.playTone(440, 0.1, 'sine');
        setTimeout(() => this.playTone(554, 0.1, 'sine'), 80);
        setTimeout(() => this.playTone(659, 0.15, 'sine'), 160);
        break;
      case 'bonus':
        this.playTone(523, 0.15, 'sine');
        setTimeout(() => this.playTone(659, 0.15, 'sine'), 100);
        setTimeout(() => this.playTone(784, 0.15, 'sine'), 200);
        setTimeout(() => this.playTone(1047, 0.3, 'sine'), 300);
        break;
    }
  }

  playTone(freq, dur, type = 'sine', target = 'sfx') {
    if (!this.ctx || (target === 'sfx' && !this.enabled) || (target === 'bgm' && !this.musicEnabled)) return;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = target === 'bgm' ? this.bgmGain : this.sfxGain;
      
      osc.type = type;
      osc.frequency.value = freq;
      
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(target === 'bgm' ? 0.2 : 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + dur);
    } catch (e) {
      console.log('Tone play error:', e);
    }
  }

  playClick() {
    this.init();
    this.playSound('click');
  }

  playSelect() {
    this.init();
    this.playSound('select');
  }

  playMatch() {
    this.init();
    this.playSound('match');
  }

  playError() {
    this.init();
    this.playSound('error');
  }

  playWin() {
    this.init();
    this.playSound('win');
  }

  playShuffle() {
    this.init();
    this.playSound('shuffle');
  }

  playCombo() {
    this.init();
    this.playSound('combo');
  }

  playBonus() {
    this.init();
    this.playSound('bonus');
  }

  playBgm() {
    if (!this.ctx || !this.musicEnabled || this.isPlaying) return;
    
    this.isPlaying = true;
    this.playNextBgm();
  }

  playNextBgm() {
    if (!this.musicEnabled) {
      this.isPlaying = false;
      return;
    }
    
    const key = 'bgm_' + (this.currentBgmIndex + 1);
    
    if (this.buffers[key]) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[key];
      source.loop = true;
      source.connect(this.bgmGain);
      source.start();
      
      this.activeSources.bgm = source;
    } else {
      this.playBgmSynthesis();
    }
  }

  playBgmSynthesis() {
    const playBeat = () => {
      if (!this.isPlaying || !this.musicEnabled) return;
      
      this.playTone(110, 0.1, 'sine', 'bgm');
      setTimeout(() => this.playTone(110, 0.1, 'sine', 'bgm'), 250);
      setTimeout(() => this.playTone(146, 0.15, 'sine', 'bgm'), 500);
      
      setTimeout(playBeat, 1000);
    };
    
    playBeat();
  }

  stopBgm() {
    this.isPlaying = false;
    if (this.activeSources.bgm) {
      try {
        this.activeSources.bgm.stop();
      } catch (e) {}
      this.activeSources.bgm = null;
    }
  }

  nextBgm() {
    this.stopBgm();
    this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmFiles.length;
    this.playBgm();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 1 : 0;
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopBgm();
    } else {
      this.playBgm();
    }
  }
}
