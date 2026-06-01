/**
 * StorageManager - Сохранение и загрузка игры
 */

import { EventEmitter } from '../utils/eventemitter.js';

export class StorageManager extends EventEmitter {
  constructor() {
    super();
    this.storageKey = 'neuroarmada_save';
    this.data = this.getDefaultData();
  }

  getDefaultData() {
    return {
      version: '1.0.0',
      player: {
        highScore: 0,
        totalScore: 0,
        gamesPlayed: 0,
        levelsCompleted: 0
      },
      settings: {
        sound: true,
        music: true,
        effects: true,
        vibration: true
      },
      progress: {
        currentLevel: 1,
        unlockedLevels: [1],
        achievements: []
      },
      stats: {
        bestCombo: 0,
        totalMatches: 0,
        totalTilesMatched: 0,
        playTime: 0
      }
    };
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.getDefaultData(), ...parsed };
        this.emit('loaded', this.data);
      }
    } catch (e) {
      console.warn('Failed to load save:', e);
      this.data = this.getDefaultData();
    }
    return this.data;
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      this.emit('saved', this.data);
      return true;
    } catch (e) {
      console.warn('Failed to save:', e);
      return false;
    }
  }

  updatePlayerScore(score) {
    this.data.player.totalScore += score;
    if (score > this.data.player.highScore) {
      this.data.player.highScore = score;
    }
    this.data.player.gamesPlayed++;
    this.save();
  }

  updateStats(stats) {
    Object.assign(this.data.stats, stats);
    this.save();
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  getSetting(key) {
    return this.data.settings[key];
  }

  completeLevel(level) {
    if (!this.data.progress.unlockedLevels.includes(level + 1)) {
      this.data.progress.unlockedLevels.push(level + 1);
    }
    this.data.progress.currentLevel = level + 1;
    this.data.player.levelsCompleted++;
    this.save();
  }

  resetProgress() {
    this.data = this.getDefaultData();
    this.save();
    this.emit('reset');
  }

  exportSave() {
    return btoa(JSON.stringify(this.data));
  }

  importSave(saveString) {
    try {
      const data = JSON.parse(atob(saveString));
      this.data = { ...this.getDefaultData(), ...data };
      this.save();
      return true;
    } catch (e) {
      console.warn('Failed to import save:', e);
      return false;
    }
  }
}