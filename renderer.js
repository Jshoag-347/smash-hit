'use strict';

const FOV = 520;
const NEAR_CLIP = 80;

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.cx     = canvas.width  / 2;
    this.cy     = canvas.height / 2;
    this._buildGradients();
  }

  resize() {
    this.cx = this.canvas.width  / 2;
    this.cy = this.canvas.height / 2;
    this._buildGradients();
  }

  project(wx, wy, wz, cameraZ) {
    const relZ = wz - cameraZ;
    if (relZ < NEAR_CLIP) return null;
    const scale = FOV / relZ;
    return { x: this.cx + wx * scale, y: this.cy - wy * scale, scale };
  }

  renderFrame(state) {
    const { ctx } = this;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    this._drawBackground(state.cameraZ);
    this._drawTunnel(state.cameraZ);

    const sortedObs = [...state.obstacles].filter(o => o.active).sort((a,b) => b.z - a.z);
    for (const obs of sortedObs) this._drawObstacle(obs, state.cameraZ);

    state.particles.render(ctx, (wx,wy,wz) => this.project(wx,wy,wz,state.cameraZ), state.cameraZ);

    for (const ball of state.projectiles)
      if (ball.active) this._drawBall(ball, state.cameraZ);

    this._drawReticle(state.mouseX, state.mouseY);

    if (state.hitFlash > 0) {
      ctx.globalAlpha = state.hitFlash * 0.45;
      ctx.fillStyle   = '#ff1133';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  _drawBackground(cameraZ) {
    const { ctx } = this;
    const W = this.canvas.width, H = this.canvas.height;
    const bg = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, Math.max(W,H)*0.7);
    bg.addColorStop(0, '#0d0d2a'); bg.addColorStop(0.6, '#060614'); bg.addColorStop(1, '#020209');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    this._drawStars(cameraZ);
  }

  _drawStars(cameraZ) {
    const { ctx } = this;
    ctx.save();
    for (let i = 0; i < 120; i++) {
      const seed  = (i * 2654435761) >>> 0;
      const sx    = ((seed & 0xFFFF) / 0xFFFF) * this.canvas.width;
      const sy    = (((seed >> 16) & 0xFFFF) / 0xFFFF) * this.canvas.height;
      const r     = 0.5 + ((seed & 0xFF) / 0xFF) * 1.2;
      const speed = 0.02 + ((seed & 0xF) / 0xF) * 0.06;
      const px    = (sx + (cameraZ * speed) % this.canvas.width) % this.canvas.width;
      const alpha = 0.3 + ((seed & 0x3F) / 0x3F) * 0.5;
      ctx.beginPath();
      ctx.arc(px, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  _drawTunnel(cameraZ) {
    const { ctx } = this;
    const cx = this.cx, cy = this.cy;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.save();
    ctx.strokeStyle = 'rgba(60,100,200,0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 7; i++) {
      const y = (i/7)*H, fac = 0.25;
      const lx = cx+(0-cx)*fac, rx = cx+(W-cx)*fac, ly = cy+(y-cy)*fac;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(lx,ly);
      ctx.moveTo(W,y); ctx.lineTo(rx,ly); ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = (i/5)*W, fac = 0.25;
      const tx = cx+(x-cx)*fac, ty = cy+(0-cy)*fac, bx = cx+(x-cx)*fac, by = cy+(H-cy)*fac;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(tx,ty);
      ctx.moveTo(x,H); ctx.lineTo(bx,by); ctx.stroke();
    }
    const vig = ctx.createRadialGradient(cx,cy,H*0.2,cx,cy,H*0.9);
    vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,10,0.65)');
    ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  _drawObstacle(obs, cameraZ) {
    switch(obs.type) {
      case 'glass': case 'moving': this._drawGlassPanel(obs, cameraZ); break;
      case 'spinblade': this._drawSpinBlade(obs, cameraZ); break;
      case 'crystal': this._drawCrystal(obs, cameraZ); break;
    }
  }

  _drawGlassPanel(obs, cameraZ) {
    const { ctx } = this;
    const relZ = obs.z - cameraZ;
    if (relZ < NEAR_CLIP) return;
    const p = this.project(obs.x, obs.y, obs.z, cameraZ);
    if (!p) return;
    const sc = p.scale, hw = obs.width/2*sc, hh = obs.height/2*sc;
    const x0 = p.x-hw, y0 = p.y-hh, W = hw*2, H = hh*2;
    const alpha = 0.55 + 0.2*(1 - Math.min(1, relZ/800));
    ctx.save();
    const g = ctx.createLinearGradient(x0,y0,x0+W,y0+H);
    g.addColorStop(0,   `rgba(80,180,255,${alpha*0.35})`);
    g.addColorStop(0.4, `rgba(160,230,255,${alpha*0.55})`);
    g.addColorStop(1,   `rgba(40,120,200,${alpha*0.30})`);
    ctx.fillStyle = g; ctx.fillRect(x0,y0,W,H);
    ctx.fillStyle = `rgba(255,255,255,${alpha*0.18})`; ctx.fillRect(x0+W*0.1,y0,W*0.08,H);
    const cellsX = Math.max(1,Math.round(obs.width/120));
    const cellsY = Math.max(1,Math.round(obs.height/120));
    ctx.strokeStyle = `rgba(180,230,255,${alpha*0.55})`; ctx.lineWidth = Math.max(0.5,sc*1.2);
    for (let c=0;c<=cellsX;c++) { const lx=x0+(c/cellsX)*W; ctx.beginPath(); ctx.moveTo(lx,y0); ctx.lineTo(lx,y0+H); ctx.stroke(); }
    for (let r=0;r<=cellsY;r++) { const ly=y0+(r/cellsY)*H; ctx.beginPath(); ctx.moveTo(x0,ly); ctx.lineTo(x0+W,ly); ctx.stroke(); }
    ctx.strokeStyle = `rgba(120,210,255,${alpha*0.9})`; ctx.lineWidth = Math.max(1,sc*2);
    ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 12*sc;
    ctx.strokeRect(x0,y0,W,H);
    ctx.restore();
  }

  _drawSpinBlade(obs, cameraZ) {
    const { ctx } = this;
    if (obs.z - cameraZ < NEAR_CLIP) return;
    const p = this.project(obs.x, obs.y, obs.z, cameraZ);
    if (!p) return;
    const sc = p.scale, len = obs.armLength*sc, wid = obs.armWidth*sc;
    const alpha = obs.hitsLeft < 2 ? 0.65 : 0.85;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(obs.angle);
    for (let arm=0;arm<2;arm++) {
      ctx.save(); ctx.rotate(arm*Math.PI/2);
      const ag = ctx.createLinearGradient(-len,-wid,len,wid);
      ag.addColorStop(0,`rgba(120,200,255,${alpha*0.4})`);
      ag.addColorStop(0.5,`rgba(200,240,255,${alpha*0.65})`);
      ag.addColorStop(1,`rgba(80,160,220,${alpha*0.4})`);
      ctx.fillStyle=ag; ctx.fillRect(-len,-wid,len*2,wid*2);
      ctx.strokeStyle=`rgba(80,180,255,${alpha})`; ctx.lineWidth=Math.max(1,sc*1.5);
      ctx.shadowColor='#00aaff'; ctx.shadowBlur=10;
      ctx.strokeRect(-len,-wid,len*2,wid*2);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0,0,wid*1.5,0,Math.PI*2);
    ctx.fillStyle=`rgba(160,230,255,${alpha*0.9})`; ctx.shadowColor='#00ccff'; ctx.shadowBlur=15; ctx.fill();
    ctx.restore();
  }

  _drawCrystal(obs, cameraZ) {
    const { ctx } = this;
    if (obs.z - cameraZ < NEAR_CLIP) return;
    const p = this.project(obs.x, obs.y, obs.z, cameraZ);
    if (!p) return;
    const size = obs.size * p.scale;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(obs.angle);
    const pulse = 0.7 + 0.3*Math.sin(obs.bobPhase*2);
    ctx.shadowColor='#00ffc8'; ctx.shadowBlur=25*pulse;
    ctx.beginPath();
    ctx.moveTo(0,-size); ctx.lineTo(size*0.6,0); ctx.lineTo(0,size); ctx.lineTo(-size*0.6,0);
    ctx.closePath();
    const cg = ctx.createLinearGradient(-size,-size,size,size);
    cg.addColorStop(0,'rgba(0,255,200,0.95)'); cg.addColorStop(0.5,'rgba(180,255,240,0.99)'); cg.addColorStop(1,'rgba(0,200,160,0.9)');
    ctx.fillStyle=cg; ctx.fill();
    ctx.strokeStyle='rgba(0,255,200,0.8)'; ctx.lineWidth=2; ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,-size); ctx.lineTo(0,size); ctx.moveTo(-size*0.6,0); ctx.lineTo(size*0.6,0); ctx.stroke();
    ctx.restore();
  }

  _drawBall(ball, cameraZ) {
    const { ctx } = this;
    const p = this.project(ball.x, ball.y, ball.z, cameraZ);
    if (!p) return;
    const r = Math.max(2, ball.radius * p.scale);
    ctx.save();
    ctx.shadowColor = 'rgba(140,180,255,0.6)'; ctx.shadowBlur = r*2;
    const grad = ctx.createRadialGradient(p.x-r*0.3, p.y-r*0.3, r*0.1, p.x, p.y, r);
    grad.addColorStop(0,'#ffffff'); grad.addColorStop(0.35,'#c8d8ff');
    grad.addColorStop(0.7,'#8899cc'); grad.addColorStop(1,'#445577');
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
  }

  _drawReticle(mx, my) {
    const { ctx } = this;
    const r = 14, arm = 7;
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(mx-arm-r,my); ctx.lineTo(mx-r+2,my);
    ctx.moveTo(mx+r-2,my);   ctx.lineTo(mx+arm+r,my);
    ctx.moveTo(mx,my-arm-r); ctx.lineTo(mx,my-r+2);
    ctx.moveTo(mx,my+r-2);   ctx.lineTo(mx,my+arm+r);
    ctx.stroke();
    ctx.restore();
  }

  _buildGradients() {}
}
