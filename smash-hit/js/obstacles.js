'use strict';

class Obstacle {
  constructor(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    this.active    = true;
    this.passed    = false;
    this.penalised = false;
  }
  update(dt) {}
  intersectsBall(ball) { return false; }
}

class GlassPanel extends Obstacle {
  constructor(x, y, z, width, height) {
    super(x, y, z);
    this.width = width; this.height = height;
    this.thickness = 20;
    this.type = 'glass';
  }
  intersectsBall(ball) {
    if (!this.active) return false;
    const hw = this.width  / 2 + ball.radius;
    const hh = this.height / 2 + ball.radius;
    const hz = this.thickness / 2 + ball.radius;
    return (
      Math.abs(ball.x - this.x) < hw &&
      Math.abs(ball.y - this.y) < hh &&
      Math.abs(ball.z - this.z) < hz
    );
  }
}

class MovingPanel extends GlassPanel {
  constructor(x, y, z, width, height, axis = 'y', amplitude = 150, speed = 1.2) {
    super(x, y, z, width, height);
    this.type = 'moving';
    this.axis = axis; this.amplitude = amplitude; this.speed = speed;
    this.phase = Math.random() * Math.PI * 2;
    this.baseX = x; this.baseY = y;
  }
  update(dt) {
    this.phase += this.speed * dt;
    if (this.axis === 'y') this.y = this.baseY + Math.sin(this.phase) * this.amplitude;
    else                   this.x = this.baseX + Math.sin(this.phase) * this.amplitude;
  }
}

class SpinBlade extends Obstacle {
  constructor(x, y, z, armLength, armWidth, rotSpeed) {
    super(x, y, z);
    this.type = 'spinblade';
    this.armLength = armLength; this.armWidth = armWidth;
    this.rotSpeed = rotSpeed;
    this.angle = Math.random() * Math.PI;
    this.thickness = 20;
    this.hitsLeft = 2;
  }
  update(dt) { if (this.active) this.angle += this.rotSpeed * dt; }
  intersectsBall(ball) {
    if (!this.active) return false;
    if (Math.abs(ball.z - this.z) > this.thickness / 2 + ball.radius) return false;
    const dx = (ball.x - this.x) * Math.cos(-this.angle) - (ball.y - this.y) * Math.sin(-this.angle);
    const dy = (ball.x - this.x) * Math.sin(-this.angle) + (ball.y - this.y) * Math.cos(-this.angle);
    const r  = ball.radius;
    if (Math.abs(dx) < this.armLength + r && Math.abs(dy) < this.armWidth + r) return true;
    if (Math.abs(dy) < this.armLength + r && Math.abs(dx) < this.armWidth + r) return true;
    return false;
  }
}

class Crystal extends Obstacle {
  constructor(x, y, z, size = 40) {
    super(x, y, z);
    this.type = 'crystal'; this.size = size;
    this.angle    = Math.random() * Math.PI * 2;
    this.spinSpd  = 1.5 + Math.random() * 1.5;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.baseY    = y; this.ballGain = 3;
  }
  update(dt) {
    this.angle += this.spinSpd * dt;
    this.bobPhase += 2 * dt;
    this.y = this.baseY + Math.sin(this.bobPhase) * 18;
  }
  intersectsBall(ball) {
    if (!this.active) return false;
    const dist = Math.sqrt((ball.x-this.x)**2 + (ball.y-this.y)**2 + (ball.z-this.z)**2);
    return dist < this.size + ball.radius;
  }
}
