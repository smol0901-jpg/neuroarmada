/**
 * MatchWorker - Web Worker для тяжёлых вычислений
 * Поиск совпадений, генерация поля, проверка ходов
 */

// Обработка сообщений от главного потока
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'findMatches':
      const matches = findMatches(data.grid, data.rows, data.cols);
      self.postMessage({ type: 'matches', matches });
      break;
      
    case 'hasValidMoves':
      const hasMoves = checkValidMoves(data.grid, data.rows, data.cols);
      self.postMessage({ type: 'validMoves', hasMoves });
      
      // Если есть ходы - находим лучший
      if (hasMoves) {
        const bestMove = findBestMove(data.grid, data.rows, data.cols);
        self.postMessage({ type: 'bestMove', bestMove });
      }
      break;
      
    case 'generateBoard':
      const board = generateBoard(data.rows, data.cols, data.level);
      self.postMessage({ type: 'board', board });
      break;
      
    case 'findBestMove':
      const move = findBestMove(data.grid, data.rows, data.cols);
      self.postMessage({ type: 'bestMove', bestMove: move });
      break;
  }
};

function findMatches(grid, rows, cols) {
  const matches = [];
  
  // Горизонтальные
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 2; c++) {
      const type = grid[r]?.[c]?.type;
      if (type === undefined) continue;
      
      let len = 1;
      while (c + len < cols && grid[r][c + len]?.type === type) len++;
      
      if (len >= 3) {
        const positions = [];
        for (let i = 0; i < len; i++) positions.push({ row: r, col: c + i });
        matches.push({ type, positions, length: len });
        c += len - 1;
      }
    }
  }
  
  // Вертикальные
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows - 2; r++) {
      const type = grid[r]?.[c]?.type;
      if (type === undefined) continue;
      
      let len = 1;
      while (r + len < rows && grid[r + len]?.[c]?.type === type) len++;
      
      if (len >= 3) {
        const positions = [];
        for (let i = 0; i < len; i++) positions.push({ row: r + i, col: c });
        matches.push({ type, positions, length: len });
        r += len - 1;
      }
    }
  }
  
  return matches;
}

function checkValidMoves(grid, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors = [
        { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
      ];
      
      for (const n of neighbors) {
        if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
          // Обмен
          const temp = grid[r][c];
          grid[r][c] = grid[n.r][n.c];
          grid[n.r][n.c] = temp;
          
          const matches = findMatches(grid, rows, cols);
          
          // Обратный обмен
          grid[n.r][n.c] = grid[r][c];
          grid[r][c] = temp;
          
          if (matches.length > 0) return true;
        }
      }
    }
  }
  return false;
}

function findBestMove(grid, rows, cols) {
  let bestScore = 0;
  let bestMove = null;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors = [
        { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
      ];
      
      for (const n of neighbors) {
        if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
          // Обмен
          const temp = grid[r][c];
          grid[r][c] = grid[n.r][n.c];
          grid[n.r][n.c] = temp;
          
          const matches = findMatches(grid, rows, cols);
          const score = calculateScore(matches);
          
          // Обратный обмен
          grid[n.r][n.c] = grid[r][c];
          grid[r][c] = temp;
          
          if (score > bestScore) {
            bestScore = score;
            bestMove = {
              from: { row: r, col: c },
              to: { row: n.r, col: n.c },
              score
            };
          }
        }
      }
    }
  }
  
  return bestMove;
}

function calculateScore(matches) {
  let score = 0;
  for (const m of matches) {
    score += m.length * 10;
    if (m.length > 3) score += (m.length - 3) * 20;
  }
  return score;
}

function generateBoard(rows, cols, level) {
  const types = Math.min(4 + Math.floor(level / 5), 7);
  const grid = [];
  
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        type: Math.floor(Math.random() * types),
        row: r, col: c
      };
    }
  }
  
  // Убираем начальные совпадения
  let matches = findMatches(grid, rows, cols);
  while (matches.length > 0) {
    for (const m of matches) {
      for (const p of m.positions) {
        grid[p.row][p.col].type = Math.floor(Math.random() * types);
      }
    }
    matches = findMatches(grid, rows, cols);
  }
  
  return grid;
}