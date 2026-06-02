/**
 * InputManager - Управление вводом (мышь, тач, клавиатура)
 * Поддержка tap, swipe, drag
 */

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = [];
    this.touchStart = null;
    this.isDragging = false;
    this.dragThreshold = 15; // Порог для определения свайпа
    this.tapTimeout = null;
    this.tapDelay = 200; // Макс время для тапа
    
    this.setupMouse();
    this.setupTouch();
    this.setupKeyboard();
  }

  setupMouse() {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onPointerUp(e));
  }

  setupTouch() {
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerDown(this.getPointerEvent(touch));
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerMove(this.getPointerEvent(touch));
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp(this.touchStart);
    }, { passive: false });
    
    this.canvas.addEventListener('touchcancel', (e) => {
      this.isDragging = false;
      this.touchStart = null;
    });
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'к') {
        this.emit('reset');
      } else if (e.key === 'h' || e.key === 'р') {
        this.emit('hint');
      } else if (e.key === 'Escape') {
        this.emit('escape');
      } else if (e.key === 'm' || e.key === 'ь') {
        this.emit('music');
      } else if (e.key === 's' || e.key === 'ы') {
        this.emit('sound');
      }
    });
  }

  getPointerEvent(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  onPointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.touchStart = { x, y, time: Date.now() };
    this.isDragging = true;
    
    // Создаём ripple эффект
    this.createRipple(e.clientX, e.clientY);
  }

  onPointerMove(e) {
    if (!this.isDragging || !this.touchStart) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = x - this.touchStart.x;
    const dy = y - this.touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > this.dragThreshold) {
      // Это свайп - определяем направление
      let dir = '';
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      
      this.emit('swipe', { x, y, direction: dir, dx, dy });
      this.isDragging = false; // Свайп обработан
    }
  }

  onPointerUp(e) {
    if (!this.touchStart) return;
    
    const duration = Date.now() - this.touchStart.time;
    
    // Если это был короткий тап - отправляем как tap
    if (duration < this.tapDelay && this.isDragging) {
      this.emit('tap', { 
        x: this.touchStart.x, 
        y: this.touchStart.y 
      });
    }
    
    this.isDragging = false;
    this.touchStart = null;
  }

  createRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    ripple.style.left = (x - 25) + 'px';
    ripple.style.top = (y - 25) + 'px';
    ripple.style.width = '50px';
    ripple.style.height = '50px';
    document.body.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
    return () => {
      this.listeners = this.listeners.filter(l => l.callback !== callback);
    };
  }

  emit(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }

  destroy() {
    this.listeners = [];
  }
}