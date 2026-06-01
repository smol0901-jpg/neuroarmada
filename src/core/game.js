/**
 * Game - Главный игровой класс
 * Управление состоянием, уровнями, счётом
 */

import { BoardManager } from './board.js';
import { MatchFinder } from './match.js';
import { AudioManager } from '../systems/audio/AudioManager.js';

export class Game {
  constructor(ctx, storage) {
    this.ctx = ctx;
    this.storage = storage;
    
    this.board = new BoardManager();
    this.matchFinder = new MatchFinder(this.board);
    this.audio = new AudioManager();
    
    this.state = 'playing'; // playing, animating, paused
    this.level = 1;
    this.score = 0;
    this.targetScore = 100;
    this.combo = 0;
    this.multiplier = 1;
    
    this.selectedTile = null;
    this.isAnimating = false;
    
    this.width = 0;
    this.height = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.board.resize(width, height);
  }

  startLevel(level) {
    this.level = level;
    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.targetScore = level * 120 + 80;
    
    this.board.generateBoard(level);
    this.updateUI();
  }

  onInput(x, y) {
    if (this.state !== 'playing' || this.isAnimating) return;
    
    const tile = this.board.getTileAt(x, y);
    if (!tile) return;
    
    if (!this.selectedTile) {
      // Выбор первой плитки
      this.selectedTile = tile;
      this.board.highlightTile(tile);
      this.audio.playClick();
    } else {
      // Вторая плитка
      if (this.selectedTile.row === tile.row && 
          this.selectedTile.col === tile.col) {
        // Отмена выбора
        this.board.clearHighlight();
        this.selectedTile = null;
      } else if (this.board.isAdjacent(
        this.selectedTile.row, this.selectedTile.col,
        tile.row, tile.col
      )) {
        // Попытка обмена
        this.attemptSwap(this.selectedTile, tile);
      } else {
        // Новый выбор
        this.board.highlightTile(tile);
        this.selectedTile = tile;
      }
    }
  }

  async attemptSwap(tile1, tile2) {
    this.isAnimating = true;
    this.board.clearHighlight();
    
    // Визуальный обмен
    await this.board.animateSwap(tile1, tile2);
    
    // Поиск совпадений
    const matches = this.matchFinder.findMatches();
    
    if (matches.length > 0) {
      // Есть совпадения - обрабатываем
      this.audio.playMatch();
      await this.processMatches(matches);
    } else {
      // Нет совпадений - возвращаем
      await this.board.animateSwap(tile1, tile2);
      this.audio.playError();
    }
    
    this.selectedTile = null;
    this.isAnimating = false;
  }

  async processMatches(matches) {
    // Подсчёт очков
    let matchScore = 0;
    for (const match of matches) {
      matchScore += match.length * 10 * this.multiplier;
    }
    
    this.score += matchScore;
    this.combo++;
    this.multiplier = Math.min(1 + this.combo * 0.5, 5);
    
    // Удаление плиток
    await this.board.removeTiles(matches);
    
    // Падение
    await this.board.dropTiles();
    await this.board.fillEmpty();
    
    // Проверка новых совпадений
    const newMatches = this.matchFinder.findMatches();
    if (newMatches.length > 0) {
      await this.processMatches(newMatches);
    } else {
      // Проверка уровня
      this.checkLevelComplete();
    }
    
    this.updateUI();
  }

  checkLevelComplete() {
    if (this.score >= this.targetScore) {
      this.audio.playWin();
      this.level++;
      this.storage.completeLevel(this.level - 1);
      this.startLevel(this.level);
    } else if (!this.matchFinder.hasValidMoves()) {
      // Нет ходов - перемешивание
      this.board.generateBoard(this.level);
      this.audio.playShuffle();
    }
  }

  showHint() {
    // Найти лучший ход
    // Пока заглушка
    this.audio.playClick();
  }

  addTiles() {
    // Добавить плитки
    this.audio.playClick();
  }

  reset() {
    this.startLevel(this.level);
    this.audio.playClick();
  }

  updateUI() {
    document.getElementById('scoreDisplay').textContent = this.score;
    document.getElementById('levelBadge').textContent = `Уровень ${this.level}`;
    
    const progress = Math.min((this.score / this.targetScore) * 100, 100);
    document.getElementById('progressFill').style.width = progress + '%';
    
    const comboBadge = document.getElementById('comboBadge');
    if (this.combo > 1) {
      comboBadge.style.display = 'block';
      comboBadge.textContent = `x${this.multiplier.toFixed(1)}`;
    } else {
      comboBadge.style.display = 'none';
    }
  }

  update(dt) {
    this.board.update(dt);
  }

  render() {
    this.board.render(this.ctx);
  }
}