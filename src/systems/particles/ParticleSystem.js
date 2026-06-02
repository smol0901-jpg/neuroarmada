/**
 * ParticleSystem - Система частиц для визуальных эффектов
 */

import { EventEmitter } from '../../utils/eventemitter.js';

export class ParticleSystem extends EventEmitter {
  constructor() {
    super();
    this.particles = [];
    this.emitters = [];
    
    this.width = 0;
    this.height = 0;
    
    this.colors = {
      0: '#FF8C42',
      1: '#4ECDC4',
      2: '#A78BFA',
      3: '#FFD700',
      4: '#FF6B6B',
      5: '#95E1D3',
      6: '#F38181'
    };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  emit(type, row, col, tileType = 0) {
    const count = type === 'match' ? 15 : 5;
    const color = this.colors[tileType] || this.colors[0];
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: col * 60 + 30,
        y: row * 60 + 30,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200 - 100,
        size: Math.random() * 8 + 4,
        color,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 1,
        decay: Math.random() * 0.02 + 0.02,
        gravity: 300
      });
    }
  }

  emitBurst(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = Math.random() * 150 + 100;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color,
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
        life: 1,
        decay: 0.02,
        gravity: 0
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
      p.life -= p.decay;
      p.alpha = p.life;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}