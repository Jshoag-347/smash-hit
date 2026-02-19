'use strict';

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawnGlassBurst(wx, wy, wz, count = 28) {
    for (let i = 0; i < count; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const speed  = 120 + Math.random() * 320;
      const spread = (Math.random() - 0.5) * 60;
      this.particles.push({
        type  : 'glass',
        x     : wx + (Math.random() - 0.5) * 40,
        y     : wy + (Math.random() - 0.5) * 40,
        z     : wz,
        vx    : Math.cos(angle) * speed,
        vy    : Math.sin(angle) * speed + 80,
        vz    : spread,
        size  : 6 + Math.random() * 18,
        angle : Math.random() * Math.PI * 2,
        spin  : (Math.random() - 0.5) * 8,
        alpha : 0.75 + Math.random() * 0.25,
        life  : 0.55 + Math.random() * 0.45,
        maxLife: 0,
        r     : 180 + Math.floor(Math.random() * 76),
        g     : 230 + Math.floor(Math.random() * 26),
        b     : 255,
      });
      this.particles[this.particles.length - 1].maxLife =
        this.particles[this.particles.length - 1].life;
    }
  }

  spawnCrystalBurst(wx, wy, wz, count = 40) {
    for (let i = 0; i < count; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const speed  = 150 + Math.random() * 400;
      const hue    = Math.random() < 0.5 ? 'gold' : 'teal';
      this.particles.push({
        type  : 'crystal',
        x     : wx, y: wy, z: wz,
        vx    : Math.cos(angle) * speed,
        vy    : Math.sin(angle) * speed,
        vz    : (Math.random() - 0.5) * 80,
        size  : 3 + Math.random() * 8,
        angle : Math.random() * Math.PI * 2,
        spin  : (Math.random() - 0.5) * 12,
        alpha : 1,
        life  : 0.6 + Math.random() * 0.6,
        maxLife: 0,
        hue,
      });
      this.particles[this.particles.length - 1].maxLife =
        this.particles[this.particles.length - 1].life;
    }
  }

  spawnHitBurst(screenCX, screenCY, count = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 280;
      this.particles.push({
        type : 'hit',
        x: screenCX, y: screenCY, z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        size  : 4 + Math.random() * 10,
        angle : Math.random() * Math.PI * 2,
        spin  : (Math.random() - 0.5) * 10,
        alpha : 1,
        life  : 0.4 + Math.random() * 0.4,
        maxLife: 0,
      });
      this.particles[this.particles.length - 1].maxLife =
        this.particles[this.particles.length - 1].life;
    }
  }

  update(dt) {
    const GRAVITY = -350;
    for (const p of this.particles) {
      if (p.type !== 'hit') p.vy += GRAVITY * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.angle += p.spin * dt;
      p.life  -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx, project, cameraZ) {
    for (const p of this.particles) {
      const t     = 1 - p.life / p.maxLife;
      const alpha = p.alpha * (1 - t);
      if (p.type === 'hit') {
        this._drawSpark(ctx, p.x, p.y, p.size * (1 - t * 0.5), p.angle, alpha, 255, 60, 60);
        continue;
      }
      const proj = project(p.x, p.y, p.z);
      if (!proj) continue;
      const size = p.size * proj.scale;
      if (size < 0.5) continue;
      if (p.type === 'glass') {
        this._drawGlassShard(ctx, proj.x, proj.y, size, p.angle, alpha, p.r, p.g, p.b);
      } else if (p.type === 'crystal') {
        const [r,g,b] = p.hue === 'gold' ? [255,215,0] : [0,255,200];
        this._drawSpark(ctx, proj.x, proj.y, size, p.angle, alpha, r, g, b);
      }
    }
  }

  _drawGlassShard(ctx, x, y, size, angle, alpha, r, g, b) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.globalAlpha = alpha * 0.7;
    const pts = [
      { x: -size*0.5, y: -size*0.8 }, { x: size*0.7, y: -size*0.2 },
      { x:  size*0.4, y:  size*0.7 }, { x: -size*0.6, y:  size*0.3 },
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle   = `rgba(${r},${g},${b},0.45)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  _drawSpark(ctx, x, y, size, angle, alpha, r, g, b) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    const s = size;
    ctx.beginPath();
    ctx.moveTo(0,-s); ctx.lineTo(s*0.2,-s*0.2); ctx.lineTo(s,0);
    ctx.lineTo(s*0.2,s*0.2); ctx.lineTo(0,s); ctx.lineTo(-s*0.2,s*0.2);
    ctx.lineTo(-s,0); ctx.lineTo(-s*0.2,-s*0.2); ctx.closePath();
    ctx.fillStyle   = `rgba(${r},${g},${b},0.9)`;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur  = size * 1.5;
    ctx.fill();
    ctx.restore();
  }
}
