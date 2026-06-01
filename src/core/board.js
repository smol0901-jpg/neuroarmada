/**
 * BoardManager - Управление игровым полем
 * Отрисовка, анимация, управление плитками
 */

import { EventEmitter } from '../utils/eventemitter.js';
import { TigerRenderer } from '../utils/tiger.js';

export class BoardManager extends EventEmitter {
  constructor() {
    super();
    
    this.grid = [];
    this.rows = 8;
    this.cols = 8;
    this.tileSize = 60;
    this.padding = 4;
    
    this.offsetX = 0;
    this.offsetY = 0;
    
    this.tiles = []; // Визуальные элементы
    this.animations = [];
    
    this.highlightedTile = null;
    this.selectedTile = null;
    
    this.tigerRenderer = new TigerRenderer();
  }

  resize(width, height) {
    // Вычисляем оптимальный размер плитки
    const maxWidth = width - 40;
    const maxHeight = height - 200;
    
    this.tileSize = Math.min(
      Math.floor(maxWidth / this.cols),
      Math.floor(maxHeight / this.rows)
    ) - this.padding * 2;
    
    this.tileSize = Math.max(40, Math.min(80, this.tileSize));
    
    // Центрирование
    this.offsetX = (width - this.cols * (this.tileSize + this.padding * 2)) / 2;
    this.offsetY = (height - this.rows * (this.tileSize + this.padding * 2)) / 2 + 40;
  }

  generateBoard(level = 1) {
    this.grid = [];
    
    // Генерация сетки
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = this.randomTile(r, c);
      }
    }
    
    // Убираем начальные совпадения
    this.removeInitialMatches();
  }

  randomTile(row, col) {
    const types = [0, 1, 2, 3]; // 4 типа тигрят
    return {
      type: types[Math.floor(Math.random() * types.length)],
      row,
      col,
      x: col,
      y: row,
      scale: 1,
      alpha: 1,
      rotation: 0
    };
  }

  removeInitialMatches() {
    let matches = true;
    while (matches) {
      matches = false;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          // Проверка горизонтали
          if (c >= 2) {
            if (this.grid[r][c].type === this.grid[r][c-1].type &&
                this.grid[r][c].type === this.grid[r][c-2].type) {
              this.grid[r][c].type = this.randomTileType();
              matches = true;
            }
          }
          // Проверка вертикали
          if (r >= 2) {
            if (this.grid[r][c].type === this.grid[r-1][c].type &&
                this.grid[r][c].type === this.grid[r-2][c].type) {
              this.grid[r][c].type = this.randomTileType();
              matches = true;
            }
          }
        }
      }
    }
  }

  randomTileType() {
    const types = [0, 1, 2, 3];
    return types[Math.floor(Math.random() * types.length)];
  }

  getTilePosition(row, col) {
    return {
      x: this.offsetX + col * (this.tileSize + this.padding * 2) + this.tileSize / 2,
      y: this.offsetY + row * (this.tileSize + this.padding * 2) + this.tileSize / 2
    };
  }

  getTileAt(x, y) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const pos = this.getTilePosition(r, c);
        const halfSize = this.tileSize / 2;
        
        if (x >= pos.x - halfSize && x <= pos.x + halfSize &&
            y >= pos.y - halfSize && y <= pos.y + halfSize) {
          return { row: r, col: c, tile: this.grid[r][c] };
        }
      }
    }
    return null;
  }

  getTileCenter(row, col) {
    return this.getTilePosition(row, col);
  }

  isAdjacent(r1, c1, r2, c2) {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  highlightTile(tile) {
    this.clearHighlight();
    this.highlightedTile = tile;
  }

  clearHighlight() {
    this.highlightedTile = null;
  }

  async animateSwap(tile1, tile2) {
    // Визуальный обмен
    const pos1 = this.getTilePosition(tile1.row, tile1.col);
    const pos2 = this.getTilePosition(tile2.row, tile2.col);
    
    // Анимация (упрощенная)
    await this.animate({
      duration: 200,
      onUpdate: (t) => {
        // Интерполяция позиций
      }
    });
    
    // Обмен в сетке
    const temp = this.grid[tile1.row][tile1.col];
    this.grid[tile1.row][tile1.col] = this.grid[tile2.row][tile2.col];
    this.grid[tile2.row][tile2.col] = temp;
    
    // Обновление координат
    this.grid[tile1.row][tile1.col].row = tile1.row;
    this.grid[tile1.row][tile1.col].col = tile1.col;
    this.grid[tile2.row][tile2.col].row = tile2.row;
    this.grid[tile2.row][tile2.col].col = tile2.col;
  }

  async removeTiles(matches) {
    for (const match of matches) {
      for (const pos of match.positions) {
        this.grid[pos.row][pos.col] = null;
      }
    }
    
    // Анимация исчезновения
    await this.animate({
      duration: 300,
      onUpdate: (t) => {
        // Анимация исчезновения
      }
    });
  }

  async dropTiles() {
    // Падение плиток вниз
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[emptyRow][c].row = emptyRow;
            this.grid[r][c] = null;
          }
          emptyRow--;
        }
      }
    }
    
    // Анимация падения
    await this.animate({
      duration: 300,
      onUpdate: (t) => {
        // Анимация падения
      }
    });
  }

  async fillEmpty() {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.grid[r][c] === null) {
          this.grid[r][c] = this.randomTile(r, c);
        }
      }
    }
  }

  animate(options) {
    return new Promise(resolve => {
      const startTime = performance.now();
      
      const loop = (currentTime) => {
        const elapsed = currentTime - startTime;
        const t = Math.min(elapsed / options.duration, 1);
        
        options.onUpdate(t);
        
        if (t < 1) {
          requestAnimationFrame(loop);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(loop);
    });
  }

  update(dt) {
    // Обновление анимаций
  }

  render(ctx) {
    ctx.save();
    
    // Фон поля
    this.renderBoardBackground(ctx);
    
    // Плитки
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        if (tile) {
          this.renderTile(ctx, tile, r, c);
        }
      }
    }
    
    ctx.restore();
  }

  renderBoardBackground(ctx) {
    const x = this.offsetX - this.padding;
    const y = this.offsetY - this.padding;
    const width = this.cols * (this.tileSize + this.padding * 2);
    const height = this.rows * (this.tileSize + this.padding * 2);
    
    // Градиентный фон
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 16);
    ctx.fill();
    
    // Сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let r = 0; r <= this.rows; r++) {
      const y = this.offsetY + r * (this.tileSize + this.padding * 2) - this.padding;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.stroke();
    }
    
    for (let c = 0; c <= this.cols; c++) {
      const x = this.offsetX + c * (this.tileSize + this.padding * 2) - this.padding;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + height);
      ctx.stroke();
    }
  }

  renderTile(ctx, tile, row, col) {
    const pos = this.getTilePosition(row, col);
    const size = this.tileSize * tile.scale;
    
    ctx.save();
    ctx.globalAlpha = tile.alpha;
    ctx.translate(pos.x, pos.y);
    ctx.rotate(tile.rotation);
    
    // Подсветка
    if (this.highlightedTile && 
        this.highlightedTile.row === row && 
        this.highlightedTile.col === col) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }
    
    // Отрисовка тигра
    this.tigerRenderer.render(ctx, tile.type, size);
    
    ctx.restore();
  }
}