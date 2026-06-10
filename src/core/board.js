/**
 * BoardManager - Управление игровым полем
 * Плитки, анимации, рендеринг
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
    
    this.tiles = [];
    this.animations = [];
    
    this.highlightedTile = null;
    this.selectedTile = null;
    
    this.tigerRenderer = new TigerRenderer();
  }

  resize(width, height) {
    console.log('Board resize:', width, height);
    
    // Отступы для мобильных
    const maxWidth = width - 40;
    const maxHeight = height - 200;
    
    this.tileSize = Math.min(
      Math.floor(maxWidth / this.cols),
      Math.floor(maxHeight / this.rows)
    ) - this.padding * 2;
    
    this.tileSize = Math.max(40, Math.min(80, this.tileSize));
    
    console.log('Tile size:', this.tileSize);
    
    // Ширина и высота поля
    const boardWidth = this.cols * (this.tileSize + this.padding * 2);
    const boardHeight = this.rows * (this.tileSize + this.padding * 2);
    
    this.offsetX = (width - boardWidth) / 2;
    this.offsetY = (height - boardHeight) / 2 + 20;
    
    console.log('Offset:', this.offsetX, this.offsetY);
  }

  generateBoard(level = 1) {
    console.log('Generating board, level:', level);
    this.grid = [];
    
    // Генерируем поле
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const tile = this.randomTile(r, c);
        this.grid[r][c] = tile;
      }
    }
    
    // Убираем начальные матчи
    this.removeInitialMatches();
    
    console.log('Grid generated, first tile:', this.grid[0]?.[0]);
  }

  randomTile(row, col) {
    const types = [0, 1, 2, 3];
    return {
      type: types[Math.floor(Math.random() * types.length)],
      row: row,
      col: col,
      x: col,
      y: row,
      targetX: col,
      targetY: row,
      scale: 1,
      alpha: 1,
      rotation: 0
    };
  }

  removeInitialMatches() {
    let matches = true;
    let iterations = 0;
    const maxIterations = 100;
    
    while (matches && iterations < maxIterations) {
      matches = false;
      iterations++;
      
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          // Проверка по горизонтали
          if (c >= 2) {
            if (this.grid[r][c].type === this.grid[r][c-1].type &&
                this.grid[r][c].type === this.grid[r][c-2].type) {
              this.grid[r][c].type = this.randomTileType();
              matches = true;
            }
          }
          // Проверка по вертикали
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

  getTileCenter(row, col) {
    return this.getTilePosition(row, col);
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

  isAdjacent(row1, col1, row2, col2) {
    const dr = Math.abs(row1 - row2);
    const dc = Math.abs(col1 - col2);
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
    const tileA = this.grid[tile1.row][tile1.col];
    const tileB = this.grid[tile2.row][tile2.col];
    
    if (!tileA || !tileB) return;

    // Получаем пиксельные позиции через getTilePosition
    const pos1 = this.getTilePosition(tile1.row, tile1.col);
    const pos2 = this.getTilePosition(tile2.row, tile2.col);
    
    // Стартовые позиции (уже в пикселях)
    const startX1 = tileA.x;
    const startY1 = tileA.y;
    const startX2 = tileB.x;
    const startY2 = tileB.y;
    
    // Целевые позиции (тоже в пикселях!)
    const targetX1 = pos2.x;
    const targetY1 = pos2.y;
    const targetX2 = pos1.x;
    const targetY2 = pos1.y;

    // Анимация перемещения
    const duration = 200;
    const startTime = performance.now();

    await new Promise(resolve => {
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing функция (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Интерполяция позиций
        tileA.x = startX1 + (targetX1 - startX1) * eased;
        tileA.y = startY1 + (targetY1 - startY1) * eased;
        tileB.x = startX2 + (targetX2 - startX2) * eased;
        tileB.y = startY2 + (targetY2 - startY2) * eased;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Финализация позиций
          tileA.x = targetX1;
          tileA.y = targetY1;
          tileB.x = targetX2;
          tileB.y = targetY2;
          
          // Обмен в сетке
          this.grid[tile1.row][tile1.col] = tileB;
          this.grid[tile2.row][tile2.col] = tileA;
          
          // Обновляем координаты
          tileA.row = tile2.row;
          tileA.col = tile2.col;
          tileB.row = tile1.row;
          tileB.col = tile1.col;
          
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  async removeTiles(matches) {
    for (const match of matches) {
      for (const pos of match.positions) {
        const tile = this.grid[pos.row][pos.col];
        if (tile) {
          tile.alpha = 0;
        }
      }
    }
    await this.sleep(150);
  }

  async dropTiles() {
    let dropped = false;
    
    for (let c = 0; c < this.cols; c++) {
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c].alpha === 0) {
          for (let above = r - 1; above >= 0; above--) {
            if (this.grid[above][c].alpha !== 0) {
              this.grid[r][c] = this.grid[above][c];
              this.grid[above][c] = { alpha: 0 };
              dropped = true;
              break;
            }
          }
        }
      }
    }
    
    if (dropped) {
      await this.sleep(200);
    }
  }

  async fillEmpty() {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.grid[r][c].alpha === 0) {
          this.grid[r][c] = this.randomTile(r, c);
        }
      }
    }
    
    await this.sleep(150);
  }

  shuffle() {
    const tiles = [];
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        tiles.push(this.grid[r][c]);
      }
    }
    
    // Перемешиваем
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    // Возвращаем в сетку
    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = tiles[idx];
        this.grid[r][c].row = r;
        this.grid[r][c].col = c;
        this.grid[r][c].x = c;
        this.grid[r][c].y = r;
        idx++;
      }
    }
  }

  addRandomTiles(count) {
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      
      this.grid[r][c] = this.randomTile(r, c);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  update(dt) {
    // Обновление позиций (движение к цели)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        if (!tile) continue;
        
        // Плавное движение к целевой позиции
        if (tile.alpha > 0) {
          const targetPos = this.getTilePosition(tile.row, tile.col);
          tile.x += (targetPos.x - tile.x) * 0.2;
          tile.y += (targetPos.y - tile.y) * 0.2;
        }
      }
    }
  }

  render(ctx) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        if (!tile || tile.alpha === 0) continue;
        
        const pos = this.getTilePosition(r, c);
        
        // Используем текущую позицию (с анимацией)
        const x = tile.x || pos.x;
        const y = tile.y || pos.y;
        
        this.tigerRenderer.render(ctx, x, y, this.tileSize, tile.type);
        
        // Подсветка
        if (this.highlightedTile && 
            this.highlightedTile.row === r && 
            this.highlightedTile.col === c) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          ctx.strokeRect(
            x - this.tileSize / 2 - 2,
            y - this.tileSize / 2 - 2,
            this.tileSize + 4,
            this.tileSize + 4
          );
        }
      }
    }
  }
}
