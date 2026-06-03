/**
 * Game - Главный игровой класс
 * Управление состоянием, уровнями, счётом
 */

import { BoardManager } from './board.js';
import { MatchFinder } from './match.js';
import { AudioManager } from '../systems/audio/AudioManager.js';
import { ParticleSystem } from '../systems/particles/ParticleSystem.js';

// Определяем базовый путь для хостинга
const BASE_PATH = '/neuroarmada';

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
    
    // Ожидание ответа от worker
    this.pendingSwap = null;
  }

  initWorker() {
    try {
      // Используем относительный путь для GitHub Pages
      const workerPath = BASE_PATH + '/src/workers/matchWorker.js';
      this.worker = new Worker(workerPath, { type: 'module' });
      this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
    } catch (e) {
      console.warn('Worker not available, using fallback');
    }
  }

  handleWorkerMessage(data) {
    switch (data.type) {
      case 'matches':
        if (data.matches.length > 0) {
          this.processMatches(data.matches);
        } else {
          // Нет матчей - возвращаем обратно
          this.undoSwap();
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
    
    // Сохраняем для отката
    this.pendingSwap = { tile1, tile2 };
    
    // Анимация обмена
    await this.board.animateSwap(tile1, tile2);
    
    if (this.worker) {
      // Отправляем в worker и ждём ответа
      this.isProcessing = true;
      this.worker.postMessage({
        type: 'findMatches',
        data: { grid: this.board.grid, rows: this.board.rows, cols: this.board.cols }
      });
    } else {
      // Fallback - синхронная проверка
      const matches = this.matchFinder.findMatches();
      if (matches.length > 0) {
        this.processMatches(matches);
      } else {
        this.undoSwap();
      }
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
    
    // Анимация возврата
    await this.board.animateSwap(tile1, tile2);
    
    this.audio.playError();
    this.isAnimating = false;
    this.isProcessing = false;
    this.pendingSwap = null;
  }

  async processMatches(matches) {
    this.isProcessing = false;
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
    
    await this.board.removeTiles(matches);
    await this.board.dropTiles();
    await this.board.fillEmpty();
    
    // Рекурсивная проверка новых матчей
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
    this.isProcessing = false;
    
    if (this.score >= this.targetScore) {
      this.audio.playWin();
      this.level++;
      this.storage.completeLevel(this.level - 1);
      this.showLevelComplete();
    } else {
      this.checkValidMoves();
    }
  }

  showLevelComplete() {
    // Показ экрана завершения уровня
    this.state = 'levelComplete';
  }

  showCombo() {
    if (this.combo > 1) {
      this.particles.emit('combo', this.width / 2, this.height / 2, this.combo);
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
    this.board.shuffle();
    this.audio.playShuffle();
    this.checkValidMoves();
  }

  updateUI() {
    // Обновление UI через storage
    if (this.storage && this.storage.updateScore) {
      this.storage.updateScore(this.score, this.targetScore);
    }
    if (this.storage && this.storage.updateLevel) {
      this.storage.updateLevel(this.level);
    }
    if (this.storage && this.storage.updateCombo) {
      this.storage.updateCombo(this.combo);
    }
  }

  update(dt) {
    this.board.update(dt);
    this.particles.update(dt);
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
}