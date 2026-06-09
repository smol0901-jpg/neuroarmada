/**
 * Game - Главный игровой класс
 * Управление состоянием, уровнями, счётом, бонусами
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
    
    this.pendingSwap = null;
    this.shuffleCount = 0;
    this.maxShuffles = 3;
    
    this.musicStarted = false;
    
    // Бонусы за комбо
    this.activeBonus = null;
    this.bonusTimer = null;
    this.bonusEffects = {
      'shield': { name: '🛡️ Щит', duration: 10000, color: '#4ADE80' },
      'slow': { name: '⏰ Замедление', duration: 8000, color: '#4ECDC4' },
      'double': { name: '✨ x2 Очки', duration: 12000, color: '#FFD700' },
      'explode': { name: '💥 Взрыв', duration: 5000, color: '#FF6B9D' }
    };
  }

  initAudio() {
    if (!this.musicStarted) {
      this.musicStarted = true;
      this.audio.init();
      
      const musicEnabled = this.storage.getSetting('music');
      if (musicEnabled !== false) {
        this.audio.playBgm();
      }
      
      const soundEnabled = this.storage.getSetting('sound');
      if (soundEnabled === false) {
        this.audio.setEnabled(false);
      }
    }
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
    this.activeBonus = null;
    
    this.board.generateBoard(level);
    this.updateUI();
    
    const matches = this.matchFinder.findMatches();
    if (matches.length > 0) {
      this.processInitialMatches();
    } else {
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
    
    if (this.activeBonus === 'double') {
      matchScore *= 2;
    }
    
    this.score += matchScore;
    this.combo++;
    this.multiplier = Math.min(1 + this.combo * 0.5, 5);
    
    this.audio.playMatch();
    this.showCombo();
    this.checkBonusActivation();
    this.updateUI();
    
    await this.board.removeTiles(matches);
    await this.board.dropTiles();
    await this.board.fillEmpty();
    
    const newMatches = this.matchFinder.findMatches();
    if (newMatches.length > 0) {
      await this.processMatches(newMatches);
    } else {
      this.checkLevelComplete();
    }
  }

  checkBonusActivation() {
    if (this.combo >= 5 && !this.activeBonus) {
      const bonusKeys = Object.keys(this.bonusEffects);
      const randomBonus = bonusKeys[Math.floor(Math.random() * bonusKeys.length)];
      this.activateBonus(randomBonus);
    }
  }

  activateBonus(bonusKey) {
    if (this.activeBonus) return;
    
    this.activeBonus = bonusKey;
    const bonus = this.bonusEffects[bonusKey];
    
    this.showBonusPopup(bonus.name, bonus.color);
    this.audio.playBonus();
    
    if (this.bonusTimer) {
      clearTimeout(this.bonusTimer);
    }
    
    this.bonusTimer = setTimeout(() => {
      this.activeBonus = null;
      this.bonusTimer = null;
    }, bonus.duration);
  }

  showBonusPopup(text, color) {
    const popup = document.querySelector('.bonus-popup');
    if (popup) {
      popup.textContent = text;
      popup.style.color = color;
      popup.classList.add('show');
      setTimeout(() => popup.classList.remove('show'), 1000);
    }
  }

  checkValidMoves() {
    if (this.shuffleCount >= this.maxShuffles) {
      console.log('Max shuffles reached');
      this.score = this.targetScore;
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
    console.log('Level check - score:', this.score, 'target:', this.targetScore);
    
    this.isAnimating = false;
    this.isProcessing = false;
    
    if (this.score >= this.targetScore) {
      this.state = 'levelComplete';
      this.audio.playWin();
      this.storage.completeLevel(this.level);
      
      const scoreExcess = this.score - this.targetScore;
      let levelsToSkip = 0;
      
      if (scoreExcess >= this.targetScore * 2) {
        levelsToSkip = 2;
      } else if (scoreExcess >= this.targetScore) {
        levelsToSkip = 1;
      }
      
      this.showLevelComplete(levelsToSkip);
    } else {
      setTimeout(() => this.checkValidMoves(), 100);
    }
  }

  showLevelComplete(levelsToSkip = 0) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    
    let nextLevelText = 'Следующий уровень →';
    if (levelsToSkip > 0) {
      nextLevelText = `Прыгнуть через ${levelsToSkip} уровень! →`;
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🎉 Уровень ${this.level} пройден!</h2>
        <p style="text-align: center; margin-bottom: 20px;">
          Очки: <strong>${this.score}</strong> / ${this.targetScore}
        </p>
        <button class="game-btn primary" id="nextLevelBtn">
          ${nextLevelText}
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('nextLevelBtn').addEventListener('click', () => {
      modal.remove();
      this.startLevel(this.level + 1 + levelsToSkip);
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
    this.hintTimeout = setTimeout(() => this.clearHint(), 3000);
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
    setTimeout(() => this.checkValidMoves(), 300);
  }

  updateUI() {
    const scoreEl = document.querySelector('.info-value:not(.target):not(.combo)');
    if (scoreEl) scoreEl.textContent = this.score;
    
    const targetEl = document.querySelector('.info-value.target');
    if (targetEl) targetEl.textContent = this.targetScore;
    
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      const percent = Math.min(100, (this.score / this.targetScore) * 100);
      progressFill.style.width = percent + '%';
    }
    
    const comboEl = document.querySelector('.info-value.combo');
    if (comboEl) comboEl.textContent = `x${this.multiplier.toFixed(1)}`;
    
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

  reset() {
    this.startLevel(this.level);
  }
  
  showHint() {
    const bestMove = this.matchFinder.findBestMove();
    if (bestMove) {
      this.showHintMove(bestMove);
    }
  }
  
  addTiles() {
    this.board.addRandomTiles(3);
    this.audio.playShuffle();
  }
}
