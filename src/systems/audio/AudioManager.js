/**
 * AudioManager - Управление звуком и музыкой
 */

import { EventEmitter } from '../../utils/eventemitter.js';

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
  }

  init() {
    if (this.ctx) return;
    
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.bgmGain = this.ctx.createGain();
    
    this.sfxGain.gain.value = 0.4;
    this.bgmGain.gain.value = 0.15;
    
    this.sfxGain.connect(this.masterGain);
    this.bgmGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    this.masterGain.gain.value = 1;
  }

  playTone(freq, dur, type = 'sine', target = 'sfx') {
    if (!this.ctx || (target === 'sfx' && !this.enabled) || (target === 'bgm' && !this.musicEnabled)) return;
    
    const osc = this.ctx.createOscillator();
    const gain = target === 'bgm' ? this.bgmGain : this.sfxGain;
    
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(target === 'bgm' ? 0.2 : 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  playClick() {
    this.init();
    this.playTone(800, 0.1, 'sine');
  }

  playMatch() {
    this.init();
    this.playTone(523, 0.15, 'sine');
    setTimeout(() => this.playTone(659, 0.15, 'sine'), 50);
    setTimeout(() => this.playTone(784, 0.2, 'sine'), 100);
  }

  playError() {
    this.init();
    this.playTone(200, 0.3, 'sawtooth');
  }

  playWin() {
    this.init();
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this.playTone(n, 0.3, 'sine'), i * 100));
  }

  playShuffle() {
    this.init();
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playTone(300 + Math.random() * 500, 0.1, 'square'), i * 50);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 1 : 0;
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
  }
}