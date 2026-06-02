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
    
    this.worker = null;
    this.initWorker();
    
    this.state = 'playing';
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
    
    // Для свайпов
    this.swipeStart = null;
  }

  initWorker() {
    try {
      this.worker = new Worker('/src/workers/matchWorker.js', { type: 'module' });
      this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
    } catch (e) {
      console.warn('Worker not available, using fallback');
    }
  }

  handleWorkerMessage(data) {
    switch (data.type) {
      case 'matches':
        if (data.matches.length > 0 && !this.isProcessing) {
          this.processMatches(data.matches);
        }
        break;
      case 'validMoves':
        if (!data.hasMoves && this.state === 'playing') {
          this.shuffleBoard();
        }
        break;
      case 'bestMove':
        if (data.bestMove) {
          this.showHintMove(data.bestMove);
        }
        break;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.board.resize(width, height);
    this.particles.resize(width, height);
  }

  startLevel(level) {
    this.level = level;
    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.targetScore = level * 120 + 80;
    
    this.board.generateBoard(level);
    this.updateUI();
    this.checkValidMoves();
  }

  onInput(x, y, type = 'tap') {
    if (this.state !== 'playing' || this.isAnimating) return;
    
    const tile = this.board.getTileAt(x, y);
    if (!tile) return;
    
    if (type === 'swipe') {
      // Обработка свайпа - пробуем сдвинуть плитку
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
      // Если ничего не выбрано - выбираем тайл под пальцем
      const tile = this.board.getTileAt(x, y);
      if (tile) {
        this.selectedTile = tile;
        this.board.highlightTile(tile);
        this.audio.playSelect();
      }
      return;
    }
    
    // Определяем направление свайпа относительно центра выбранной плитки
    const tileCenter = this.board.getTileCenter(this.selectedTile.row, this.selectedTile.col);
    const dx = x - tileCenter.x;
    const dy = y - tileCenter.y;
    
    let targetRow = this.selectedTile.row;
    let targetCol = this.selectedTile.col;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Горизонтальный свайп
      targetCol += dx > 0 ? 1 : -1;
    } else {
      // Вертикальный свайп
      targetRow += dy > 0 ? 1 : -1;
    }
    
    const targetTile = this.board.getTileAtPosition(targetRow, targetCol);
    if (targetTile && this.board.isAdjacent(
      this.selectedTile.row, this.selectedTile.col,
      targetRow, targetCol
    )) {
      this.attemptSwap(this.selectedTile, targetTile);
    }
  }

  async attemptSwap(tile1, tile2) {
    this.isAnimating = true;
    this.board.clearHighlight();
    
    await this.board.animateSwap(tile1, tile2);
    
    // Проверяем через worker
    if (this.worker) {
      this.isProcessing = true;
      this.worker.postMessage({
        type: 'findMatches',
        data: { grid: this.board.grid, rows: this.board.rows, cols: this.board.cols }
      });
    } else {
      const matches = this.matchFinder.findMatches();
      if (matches.length > 0) {
        this.processMatches(matches);
      } else {
        await this.board.animateSwap(tile1, tile2);
        this.audio.playError();
      }
    }
    
    this.selectedTile = null;
  }

  async processMatches(matches) {
    this.isProcessing = false;
    this.isAnimating = true;
    
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
    
    await this.board.removeTiles(matches);
    await this.board.dropTiles();
    await this.board.fillEmpty();
    
    // Проверяем новые совпадения
    if (this.worker) {
      this.isProcessing = true;
      this.worker.postMessage({
        type: 'findMatches',
        data: { grid: this.board.grid, rows: this.board.rows, cols: this.board.cols }
      });
    } else {
      const newMatches = this.matchFinder.findMatches();
      if (newMatches.length > 0) {
        await this.processMatches(newMatches);
      } else {
        this.checkLevelComplete();
      }
    }
    
    this.updateUI();
  }

  checkValidMoves() {
    if (this.worker) {
      this.worker.postMessage({
        type: 'hasValidMoves',
        data: { grid: this.board.grid, rows: this.board.rows, cols: this.board.cols }
      });
    }
  }

  checkLevelComplete() {
    this.isAnimating = false;
    
    if (this.score >= this.targetScore) {
      this.audio.playWin();
      this.level++;
      this.storage.completeLevel(this.level - 1);
      this.showLevelComplete();
      setTimeout(() => this.startLevel(this.level), 2500);
    } else {
      this.checkValidMoves();
    }
  }

  shuffleBoard() {
    this.audio.playShuffle();
    this.board.generateBoard(this.level);
    this.checkValidMoves();
  }

  showHint() {
    if (this.worker) {
      this.worker.postMessage({
        type: 'findBestMove',
        data: { grid: this.board.grid, rows: this.board.rows, cols: this.board.cols }
      });
    }
  }

  showHintMove(move) {
    this.hintTile = move.from;
    this.board.highlightTile({ row: move.from.row, col: move.from.col });
    
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => {
      this.clearHint();
    }, 3000);
  }

  clearHint() {
    this.board.clearHighlight();
    this.hintTile = null;
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
  }

  showCombo() {
    const badge = document.getElementById('comboBadge');
    if (this.combo > 1) {
      badge.textContent = `x${this.multiplier.toFixed(1)}`;
      badge.classList.add('show');
      this.audio.playCombo();
      setTimeout(() => badge.classList.remove('show'), 600);
    }
  }

  showLevelComplete() {
    const badge = document.getElementById('levelBadge');
    badge.textContent = '🎉 Уровень пройден!';
    badge.classList.add('show');
    setTimeout(() => {
      badge.classList.remove('show');
      badge.textContent = `Уровень ${this.level}`;
    }, 2000);
  }

  addTiles() {
    this.audio.playClick();
    // Дополнительная функция - можно добавить бонусы
  }

  reset() {
    this.clearHint();
    this.startLevel(this.level);
    this.audio.playClick();
  }

  updateUI() {
    document.getElementById('scoreDisplay').textContent = this.score;
    document.getElementById('targetDisplay').textContent = this.targetScore;
    document.getElementById('levelBadge').textContent = `Уровень ${this.level}`;
    document.getElementById('comboDisplay').textContent = `x${this.multiplier.toFixed(1)}`;
    
    const progress = Math.min((this.score / this.targetScore) * 100, 100);
    document.getElementById('progressFill').style.width = progress + '%';
  }

  update(dt) {
    this.board.update(dt);
    this.particles.update(dt);
  }

  render() {
    this.board.render(this.ctx);
    this.particles.render(this.ctx);
  }
}