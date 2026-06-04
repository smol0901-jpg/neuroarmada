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
    
    this.tiles = [];
    this.animations = [];
    
    this.highlightedTile = null;
    this.selectedTile = null;
    
    this.tigerRenderer = new TigerRenderer();
  }

  resize(width, height) {
    console.log('Board resize:', width, height);
    
    // Вычисляем оптимальный размер плитки
    const maxWidth = width - 40;
    const maxHeight = height - 200;
    
    this.tileSize = Math.min(
      Math.floor(maxWidth / this.cols),
      Math.floor(maxHeight / this.rows)
    ) - this.padding * 2;
    
    this.tileSize = Math.max(40, Math.min(80, this.tileSize));
    
    console.log('Tile size:', this.tileSize);
    
    // Центрирование
    const boardWidth = this.cols * (this.tileSize + this.padding * 2);
    const boardHeight = this.rows * (this.tileSize + this.padding * 2);
    
    this.offsetX = (width - boardWidth) / 2;
    this.offsetY = (height - boardHeight) / 2 + 20;
    
    console.log('Offset:', this.offsetX, this.offsetY);
  }

  generateBoard(level = 1) {
    console.log('Generating board, level:', level);
    this.grid = [];
    
    // Генерация сетки
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const tile = this.randomTile(r, c);
        this.grid[r][c] = tile;
      }
    }
    
    // Убираем начальные совпадения
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
          // Горизонталь
          if (c >= 2) {
            if (this.grid[r][c].type === this.grid[r][c-1].type &&
                this.grid[r][c].type === this.grid[r][c-2].type) {
              this.grid[r][c].type = this.randomTileType();
              matches = true;
            }
          }
          // Вертикаль
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
    const tileA = this.grid[tile1.row][tile1.col];
    const tileB = this.grid[tile2.row][tile2.col];
    
    if (!tileA || !tileB) return;
    
    // Сохраняем стартовые позиции
    const startX1 = tileA.x;
    const startY1 = tileA.y;
    const startX2 = tileB.x;
    const startY2 = tileB.y;
    
    // Устанавливаем целевые позиции
    tileA.targetX = tile2.col;
    tileA.targetY = tile2.row;
    tileB.targetX = tile1.col;
    tileB.targetY = tile1.row;
    
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
        tileA.x = startX1 + (tile2.col - startX1) * eased;
        tileA.y = startY1 + (tile2.row - startY1) * eased;
        tileB.x = startX2 + (tile1.col - startX2) * eased;
        tileB.y = startY2 + (tile1.row - startY2) * eased;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Финализация позиций
          tileA.x = tile2.col;
          tileA.y = tile2.row;
          tileB.x = tile1.col;
          tileB.y = tile1.row;
          
          // Обмен в сетке
          this.grid[tile1.row][tile1.col] = tileB;
          this.grid[tile2.row][tile2.col] = tileA;
          
          // Обновление логических координат
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
    const duration = 300;
    const startTime = performance.now();
    
    for (const match of matches) {
      for (const pos of match.positions) {
        const tile = this.grid[pos.row]?.[pos.col];
        if (tile) {
          tile.removing = true;
        }
      }
    }
    
    await new Promise(resolve => {
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        
        for (const match of matches) {
          for (const pos of match.positions) {
            const tile = this.grid[pos.row]?.[pos.col];
            if (tile) {
              tile.scale = 1 - eased;
              tile.alpha = 1 - eased;
            }
          }
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          for (const match of matches) {
            for (const pos of match.positions) {
              this.grid[pos.row][pos.col] = null;
            }
          }
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  async dropTiles() {
    const duration = 250;
    const startTime = performance.now();
    
    // Вычисляем новые позиции
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[emptyRow][c].row = emptyRow;
            this.grid[emptyRow][c].targetY = emptyRow;
            this.grid[r][c] = null;
          }
          emptyRow--;
        }
      }
    }
    
    await new Promise(resolve => {
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const tile = this.grid[r][c];
            if (tile) {
              tile.y = tile.y + (tile.targetY - tile.y) * eased * 0.3;
            }
          }
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const tile = this.grid[r][c];
              if (tile) {
                tile.y = tile.targetY;
              }
            }
          }
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  async fillEmpty() {
    const duration = 200;
    
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.grid[r][c] === null) {
          const newTile = this.randomTile(r, c);
          newTile.y = -1 - (this.rows - r);
          newTile.targetY = r;
          this.grid[r][c] = newTile;
        }
      }
    }
    
    const startTime = performance.now();
    
    await new Promise(resolve => {
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const tile = this.grid[r][c];
            if (tile && tile.y < r) {
              tile.y = tile.y + (tile.targetY - tile.y) * eased * 0.2;
              tile.scale = eased;
            }
          }
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const tile = this.grid[r][c];
              if (tile) {
                tile.y = tile.targetY;
                tile.scale = 1;
              }
            }
          }
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  update(dt) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        if (tile) {
          if (Math.abs(tile.x - tile.targetX) > 0.01) {
            tile.x += (tile.targetX - tile.x) * 0.15;
          }
          if (Math.abs(tile.y - tile.targetY) > 0.01) {
            tile.y += (tile.targetY - tile.y) * 0.15;
          }
        }
      }
    }
  }

  render(ctx) {
    // Рисуем фон поля
    const boardWidth = this.cols * (this.tileSize + this.padding * 2);
    const boardHeight = this.rows * (this.tileSize + this.padding * 2);
    
    ctx.fillStyle = 'rgba(26, 26, 46, 0.5)';
    ctx.beginPath();
    ctx.roundRect(this.offsetX - 10, this.offsetY - 10, 
                 boardWidth + 20, boardHeight + 20, 16);
    ctx.fill();
    
    // Рисуем плитки
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        if (!tile) continue;
        
        // Используем визуальные координаты для позиции
        const visualX = tile.x !== undefined ? tile.x : c;
        const visualY = tile.y !== undefined ? tile.y : r;
        
        const pos = this.getTilePosition(visualY, visualX);
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(tile.scale || 1, tile.scale || 1);
        ctx.globalAlpha = tile.alpha || 1;
        
        this.tigerRenderer.render(ctx, tile.type, this.tileSize);
        
        ctx.restore();
      }
    }
  }

  shuffle() {
    // Перемешивание всех плиток
    const allTiles = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        allTiles.push(this.grid[r][c]);
      }
    }
    
    // Перемешиваем
    for (let i = allTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
    }
    
    // Распределяем обратно
    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        allTiles[idx].row = r;
        allTiles[idx].col = c;
        allTiles[idx].x = c;
        allTiles[idx].y = r;
        allTiles[idx].targetX = c;
        allTiles[idx].targetY = r;
        this.grid[r][c] = allTiles[idx];
        idx++;
      }
    }
  }
}