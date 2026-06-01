/**
 * MatchFinder - Поиск совпадений на поле
 */

export class MatchFinder {
  constructor(board) {
    this.board = board;
  }

  findMatches() {
    const matches = [];
    const visited = new Set();
    
    // Горизонтальные совпадения
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols - 2; c++) {
        const type = this.board.grid[r][c]?.type;
        if (type === undefined) continue;
        
        let matchLength = 1;
        while (c + matchLength < this.board.cols && 
               this.board.grid[r][c + matchLength]?.type === type) {
          matchLength++;
        }
        
        if (matchLength >= 3) {
          const positions = [];
          for (let i = 0; i < matchLength; i++) {
            positions.push({ row: r, col: c + i });
          }
          matches.push({ type, positions, length: matchLength });
          c += matchLength - 1;
        }
      }
    }
    
    // Вертикальные совпадения
    for (let c = 0; c < this.board.cols; c++) {
      for (let r = 0; r < this.board.rows - 2; r++) {
        const type = this.board.grid[r][c]?.type;
        if (type === undefined) continue;
        
        let matchLength = 1;
        while (r + matchLength < this.board.rows && 
               this.board.grid[r + matchLength][c]?.type === type) {
          matchLength++;
        }
        
        if (matchLength >= 3) {
          const positions = [];
          for (let i = 0; i < matchLength; i++) {
            positions.push({ row: r + i, col: c });
          }
          matches.push({ type, positions, length: matchLength });
          r += matchLength - 1;
        }
      }
    }
    
    return matches;
  }

  findMatchesAround(row, col) {
    const type = this.board.grid[row][col]?.type;
    if (type === undefined) return [];
    
    const matches = [];
    
    // Горизонталь
    const hMatch = this.findHorizontalMatch(row, col, type);
    if (hMatch.length >= 3) matches.push(hMatch);
    
    // Вертикаль
    const vMatch = this.findVerticalMatch(row, col, type);
    if (vMatch.length >= 3) matches.push(vMatch);
    
    return matches;
  }

  findHorizontalMatch(row, col, type) {
    const positions = [{ row, col }];
    
    // Влево
    for (let c = col - 1; c >= 0; c--) {
      if (this.board.grid[row][c]?.type === type) {
        positions.unshift({ row, col: c });
      } else break;
    }
    
    // Вправо
    for (let c = col + 1; c < this.board.cols; c++) {
      if (this.board.grid[row][c]?.type === type) {
        positions.push({ row, col: c });
      } else break;
    }
    
    return { type, positions, length: positions.length };
  }

  findVerticalMatch(row, col, type) {
    const positions = [{ row, col }];
    
    // Вверх
    for (let r = row - 1; r >= 0; r--) {
      if (this.board.grid[r][col]?.type === type) {
        positions.unshift({ row: r, col });
      } else break;
    }
    
    // Вниз
    for (let r = row + 1; r < this.board.rows; r++) {
      if (this.board.grid[r][col]?.type === type) {
        positions.push({ row: r, col });
      } else break;
    }
    
    return { type, positions, length: positions.length };
  }

  hasValidMoves() {
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        // Проверка соседей
        const neighbors = [
          { r: r - 1, c },
          { r: r + 1, c },
          { r, c: c - 1 },
          { r, c: c + 1 }
        ];
        
        for (const n of neighbors) {
          if (n.r >= 0 && n.r < this.board.rows && 
              n.c >= 0 && n.c < this.board.cols) {
            // Временный обмен
            this.swapTiles(r, c, n.r, n.c);
            const matches = this.findMatches();
            this.swapTiles(r, c, n.r, n.c);
            
            if (matches.length > 0) return true;
          }
        }
      }
    }
    return false;
  }

  swapTiles(r1, c1, r2, c2) {
    const temp = this.board.grid[r1][c1];
    this.board.grid[r1][c1] = this.board.grid[r2][c2];
    this.board.grid[r2][c2] = temp;
  }
}