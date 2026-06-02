/**
 * InputManager - Управление вводом (мышь, тач, клавиатура)
 */

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = [];
    this.touchStart = null;
    this.isDragging = false;
    this.dragThreshold = 10;
    
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
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'к') {
        this.emit('reset');
      } else if (e.key === 'h' || e.key === 'р') {
        this.emit('hint');
      } else if (e.key === 'Escape') {
        this.emit('escape');
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
    
    this.emit('tap', { x, y });
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
      // Свайп
      let dir = '';
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      
      this.emit('swipe', { x, y, direction: dir });
      this.isDragging = false;
    }
  }

  onPointerUp(e) {
    if (this.isDragging && this.touchStart) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Проверка длительности - короткий тап
      const duration = Date.now() - this.touchStart.time;
      if (duration < 200) {
        this.emit('tap', { x, y });
      }
    }
    
    this.isDragging = false;
    this.touchStart = null;
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