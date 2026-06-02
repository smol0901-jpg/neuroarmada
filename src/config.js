/**
 * Game Configuration - Настройки игры
 */

export const CONFIG = {
  // Размер поля
  board: {
    rows: 8,
    cols: 8,
    minMatch: 3
  },
  
  // Типы плиток (по уровням)
  tileTypes: {
    base: 4,
    perLevel: 1,
    max: 7
  },
  
  // Очки
  scoring: {
    basePerTile: 10,
    lengthBonus: 20,
    comboMultiplier: 0.5,
    maxMultiplier: 5
  },
  
  // Цель уровня
  target: {
    base: 100,
    perLevel: 120,
    offset: 80
  },
  
  // Анимации
  animation: {
    swapDuration: 200,
    removeDuration: 300,
    dropDuration: 300,
    fillDuration: 200
  },
  
  // Подсказки
  hint: {
    duration: 3000,
    cooldown: 5000
  },
  
  // Частицы
  particles: {
    matchCount: 15,
    selectCount: 5,
    burstCount: 20
  },
  
  // Цвета плиток
  colors: {
    0: { main: '#FF8C42', dark: '#E87A30', stroke: '#2D1B00' },
    1: { main: '#4ECDC4', dark: '#3DB8B0', stroke: '#1A5C56' },
    2: { main: '#A78BFA', dark: '#9370DB', stroke: '#4B0082' },
    3: { main: '#FFD700', dark: '#FFA500', stroke: '#8B4513' },
    4: { main: '#FF6B6B', dark: '#E85555', stroke: '#8B0000' },
    5: { main: '#95E1D3', dark: '#7AD4C4', stroke: '#2F4F4F' },
    6: { main: '#F38181', dark: '#E57070', stroke: '#8B0000' }
  },
  
  // UI
  ui: {
    font: 'Nunito, sans-serif',
    bgDark: '#0f0f1a',
    bgCard: '#1a1a2e',
    accentOrange: '#FF8C42',
    accentYellow: '#FFD700',
    accentCyan: '#4ECDC4',
    accentPurple: '#A78BFA'
  }
};

export default CONFIG;