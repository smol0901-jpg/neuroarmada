/**
 * TigerRenderer - Отрисовка тигрят
 */

export class TigerRenderer {
  constructor() {
    this.colors = {
      0: { main: '#FF8C42', dark: '#E87A30', stroke: '#2D1B00', eye: '#2D1B00' },
      1: { main: '#4ECDC4', dark: '#3DB8B0', stroke: '#1A5C56', eye: '#1A5C56' },
      2: { main: '#A78BFA', dark: '#9370DB', stroke: '#4B0082', eye: '#4B0082' },
      3: { main: '#FFD700', dark: '#FFA500', stroke: '#8B4513', eye: '#8B4513' }
    };
  }

  render(ctx, x, y, size, type) {
    const c = this.colors[type] || this.colors[0];
    const s = size / 2;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Голова
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = c.main;
    ctx.fill();
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Уши
    this.drawEar(ctx, -s * 0.5, -s * 0.7, s * 0.25, c);
    this.drawEar(ctx, s * 0.5, -s * 0.7, s * 0.25, c);
    
    // Глаза
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, -s * 0.1, s * 0.2, s * 0.25, 0, 0, Math.PI * 2);
    ctx.ellipse(s * 0.25, -s * 0.1, s * 0.2, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Зрачки
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(-s * 0.25, -s * 0.1, s * 0.1, 0, Math.PI * 2);
    ctx.arc(s * 0.25, -s * 0.1, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Блики
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.15, s * 0.05, 0, Math.PI * 2);
    ctx.arc(s * 0.2, -s * 0.15, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    // Нос
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.1);
    ctx.lineTo(-s * 0.12, s * 0.2);
    ctx.lineTo(s * 0.12, s * 0.2);
    ctx.closePath();
    ctx.fill();
    
    // Рот
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, s * 0.15, s * 0.2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Щёки
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.5, s * 0.1, s * 0.15, s * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(s * 0.5, s * 0.1, s * 0.15, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  drawEar(ctx, x, y, size, c) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = c.main;
    ctx.fill();
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}