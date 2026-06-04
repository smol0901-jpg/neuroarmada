/**
 * Game - Главный игровой класс
 * Управление состоянием, уровнями, счётом
 */

import { BoardManager } from './board.js';
import { MatchFinder } from './match.js';
import { AudioManager } from '../systems/audio/AudioManager.js';
import { ParticleSystem } from '../systems/particles/ParticleSystem.js';

export class Game {
  constructor(ctx, storage) {
    this.ctx = ctx;
    this.storage = storage;
    
    this.board = new BoardManager();
    this.matchFinder = new MatchFinder(this.board);
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    
    this.state = 'playing'; // playing, animating, levelComplete, gameOver
    this.level = 1;
    this.score = 0;
    this.targetScore = 100;
    this.combo = 0;
    this.multiplier = 1;
    
    this.selectedTile = null;
    this.isAnimating = false;
    this.isProcessing = false;
    
    this.width = 0;
    this.height = 0;
    
    this.hintTile = null;
    this.hintTimeout = null;
    
    this.pendingSwap = null;
    
    // Защита от бесконечного цикла
    this.shuffleCount = 0;
    this.maxShuffles = 3;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.board.resize(width, height);
    this.particles.resize(width, height);
  }

  startLevel(level) {
    console.log('Starting level:', level);
    
    this.level = level;
    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.targetScore = level * 120 + 80;
    this.shuffleCount = 0;
    this.state = 'playing';
    
    this.board.generateBoard(level);
    this.updateUI();
    
    // Проверяем есть ли матчи после генерации
    const matches = this.matchFinder.findMatches();
    if (matches.length > 0) {
      // Убираем начальные матчи
      this.processInitialMatches();
    } else {
      // Проверяем допустимые ходы
      this.checkValidMoves();
    }
  }

  async processInitialMatches() {
    this.isProcessing = true;
    
    let matches = this.matchFinder.findMatches();
    while (matches.length > 0) {
      await this.board.removeTiles(matches);
      await this.board.dropTiles();
      await this.board.fillEmpty();
      matches = this.matchFinder.findMatches();
    }
    
    this.isProcessing = false;
    this.checkValidMoves();
  }

  onInput(x, y, type = 'tap') {
    if (this.state !== 'playing' || this.isAnimating || this.isProcessing) {
      console.log('Input blocked, state:', this.state, 'animating:', this.isAnimating);
      return;
    }
    
    const tile = this.board.getTileAt(x, y);
    if (!tile) return;
    
    if (type === 'swipe') {
      this.handleSwipe(x, y);
      return;
    }
    
    this.clearHint();
    
    if (!this.selectedTile) {
      this.selectedTile = tile;
      this.board.highlightTile(tile);
      this.audio.playSelect();
      this.particles.emit('select', tile.row, tile.col);
    } else {
      if (this.selectedTile.row === tile.row && 
          this.selectedTile.col === tile.col) {
        this.board.clearHighlight();
        this.selectedTile = null;
      } else if (this.board.isAdjacent(
        this.selectedTile.row, this.selectedTile.col,
        tile.row, tile.col
      )) {
        this.attemptSwap(this.selectedTile, tile);
      } else {
        this.board.highlightTile(tile);
        this.selectedTile = tile;
        this.audio.playSelect();
      }
    }
  }

  handleSwipe(x, y) {
    if (!this.selectedTile) {
      const tile = this.board.getTileAt(x, y);
      if (tile) {
        this.selectedTile = tile;
        this.board.highlightTile(tile);
        this.audio.playSelect();
      }
      return;
    }
    
    const tileCenter = this.board.getTileCenter(this.selectedTile.row, this.selectedTile.col);
    const dx = x - tileCenter.x;
    const dy = y - tileCenter.y;
    
    let targetRow = this.selectedTile.row;
    let targetCol = this.selectedTile.col;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      targetCol += dx > 0 ? 1 : -1;
    } else {
      targetRow += dy > 0 ? 1 : -1;
    }
    
    const targetTile = this.getTileAtPosition(targetRow, targetCol);
    if (targetTile && this.board.isAdjacent(
      this.selectedTile.row, this.selectedTile.col,
      targetRow, targetCol
    )) {
      this.attemptSwap(this.selectedTile, targetTile);
    }
  }

  async attemptSwap(tile1, tile2) {
    this.isAnimating = true;
    this.isProcessing = true;
    this.board.clearHighlight();
    
    this.pendingSwap = { tile1, tile2 };
    
    await this.board.animateSwap(tile1, tile2);
    
    const matches = this.matchFinder.findMatches();
    
    if (matches.length > 0) {
      await this.processMatches(matches);
    } else {
      await this.undoSwap();
    }
    
    this.selectedTile = null;
  }

  async undoSwap() {
    if (!this.pendingSwap) {
      this.isAnimating = false;
      this.isProcessing = false;
      return;
    }
    
    const { tile1, tile2 } = this.pendingSwap;
    await this.board.animateSwap(tile1, tile2);
    
    this.audio.playError();
    this.isAnimating = false;
    this.isProcessing = false;
    this.pendingSwap = null;
  }

  async processMatches(matches) {
    this.isProcessing = true;
    this.isAnimating = true;
    this.pendingSwap = null;
    
    let matchScore = 0;
    for (const match of matches) {
      matchScore += match.length * 10 * this.multiplier;
      
      for (const pos of match.positions) {
        this.particles.emit('match', pos.row, pos.col, match.type);
      }
    }
    
    this.score += matchScore;
    this.combo++;
    this.multiplier = Math.min(1 + this.combo * 0.5, 5);
    
    this.audio.playMatch();
    this.showCombo();
    this.updateUI();
    
    await this.board.removeTiles(matches);
    await this.board.dropTiles();
    await this.board.fillEmpty();
    
    // Рекурсивная проверка новых матчей
    const newMatches = this.matchFinder.findMatches();
    if (newMatches.length > 0) {
      await this.processMatches(newMatches);
    } else {
      this.checkLevelComplete();
    }
  }

  checkValidMoves() {
    if (this.shuffleCount >= this.maxShuffles) {
      console.log('Max shuffles reached, forcing level complete');
      this.score = this.targetScore; // Даём достаточно очков
      this.checkLevelComplete();
      return;
    }
    
    const hasMoves = this.matchFinder.hasValidMoves();
    if (!hasMoves) {
      console.log('No valid moves, shuffling');
      this.shuffleBoard();
    } else {
      this.isProcessing = false;
      this.isAnimating = false;
    }
  }

  checkLevelComplete() {
    console.log('Checking level complete, score:', this.score, 'target:', this.targetScore);
    
    this.isAnimating = false;
    this.isProcessing = false;
    
    if (this.score >= this.targetScore) {
      this.state = 'levelComplete';
      this.audio.playWin();
      
      // Сохраняем прогресс
      this.storage.completeLevel(this.level);
      
      // Показываем экран уровня
      this.showLevelComplete();
    } else {
      // Проверяем допустимые ходы
      setTimeout(() => this.checkValidMoves(), 100);
    }
  }

  showLevelComplete() {
    // Создаём модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🎉 Уровень ${this.level} пройден!</h2>
        <p style="text-align: center; margin-bottom: 20px;">
          Очки: <strong>${this.score}</strong> / ${this.targetScore}
        </p>
        <button class="game-btn primary" id="nextLevelBtn">
          Следующий уровень →
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('nextLevelBtn').addEventListener('click', () => {
      modal.remove();
      this.startLevel(this.level + 1);
    });
  }

  showCombo() {
    if (this.combo > 1) {
      const comboEl = document.querySelector('.combo-badge');
      if (comboEl) {
        comboEl.textContent = `x${this.combo}`;
        comboEl.classList.add('show');
        setTimeout(() => comboEl.classList.remove('show'), 600);
      }
    }
  }

  showHintMove(bestMove) {
    this.clearHint();
    
    this.hintTile = {
      row: bestMove.fromRow,
      col: bestMove.fromCol
    };
    
    this.board.highlightTile(this.hintTile);
    
    this.hintTimeout = setTimeout(() => {
      this.clearHint();
    }, 3000);
  }

  clearHint() {
    if (this.hintTile) {
      this.board.clearHighlight();
      this.hintTile = null;
    }
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
  }

  shuffleBoard() {
    this.shuffleCount++;
    console.log('Shuffle #', this.shuffleCount);
    
    this.board.shuffle();
    this.audio.playShuffle();
    
    // Проверяем что после перемешивания есть ходы
    setTimeout(() => {
      this.checkValidMoves();
    }, 300);
  }

  updateUI() {
    console.log('Update UI - Score:', this.score, 'Target:', this.targetScore, 'Level:', this.level);
    
    // Обновляем очки
    const scoreEl = document.querySelector('.info-value:not(.target):not(.combo)');
    if (scoreEl) scoreEl.textContent = this.score;
    
    // Обновляем цель
    const targetEl = document.querySelector('.info-value.target');
    if (targetEl) targetEl.textContent = this.targetScore;
    
    // Обновляем прогресс
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      const percent = Math.min(100, (this.score / this.targetScore) * 100);
      progressFill.style.width = percent + '%';
    }
    
    // Обновляем комбо
    const comboEl = document.querySelector('.info-value.combo');
    if (comboEl) comboEl.textContent = `x${this.multiplier.toFixed(1)}`;
    
    // Обновляем уровень
    const levelBadge = document.querySelector('.level-badge');
    if (levelBadge) levelBadge.textContent = `🎯 Уровень ${this.level}`;
  }

  update(dt) {
    if (this.state === 'playing') {
      this.board.update(dt);
      this.particles.update(dt);
    }
  }

  render(ctx) {
    this.board.render(ctx);
    this.particles.render(ctx);
  }

  getTileAtPosition(row, col) {
    if (row < 0 || row >= this.board.rows || col < 0 || col >= this.board.cols) {
      return null;
    }
    return { row, col, tile: this.board.grid[row][col] };
  }

  // Методы для кнопок
  reset() {
    this.startLevel(this.level);
  }
  
  showHint() {
    // Найти лучший ход
    const bestMove = this.matchFinder.findBestMove();
    if (bestMove) {
      this.showHintMove(bestMove);
    }
  }
  
  addTiles() {
    // Добавить специальные плитки
  }
}