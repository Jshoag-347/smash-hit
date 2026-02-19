'use strict';

const TRACK_HW = 500;
const TRACK_HH = 330;

class LevelGenerator {
  static generateSection(startZ, difficulty) {
    const d    = Math.min(difficulty, 3);
    const pool = this._buildPool(d);
    const patternFn = pool[Math.floor(Math.random() * pool.length)];
    return patternFn(startZ, difficulty);
  }

  static _buildPool(d) {
    const always = [this._pSingle, this._pCrystalAlone, this._pDoubleSideBySide];
    const medium = [this._pTripleRow, this._pMovingV, this._pCrystalFlanked, this._pCheckerboard];
    const hard   = [this._pSpinBlade, this._pMovingH, this._pGauntlet, this._pZigzag, this._pDualSpin];
    let pool = [...always];
    if (d >= 0.4) pool = pool.concat(medium);
    if (d >= 0.9) pool = pool.concat(hard);
    return pool;
  }

  static _pSingle(z) { return [new GlassPanel(0, 0, z, 360, 480)]; }

  static _pCrystalAlone(z) {
    return [new Crystal((Math.random()-0.5)*260, (Math.random()-0.5)*200, z)];
  }

  static _pDoubleSideBySide(z) {
    const gap = 90 + Math.random() * 60, w = 220, h = 420;
    return [new GlassPanel(-w/2-gap/2, 0, z, w, h), new GlassPanel(w/2+gap/2, 0, z, w, h)];
  }

  static _pTripleRow(z) {
    const gap = 80 + Math.random() * 40, w = 160, h = 500;
    return [
      new GlassPanel(-(w+gap), 0, z, w, h),
      new GlassPanel(0,        0, z, w, h),
      new GlassPanel( (w+gap), 0, z, w, h),
    ];
  }

  static _pMovingV(z, diff) {
    return [new MovingPanel(0, 0, z, 300, 440, 'y', 120+diff*40, 1.0+diff*0.5)];
  }

  static _pMovingH(z, diff) {
    return [new MovingPanel(0, 0, z, 300, 440, 'x', 180+diff*60, 0.9+diff*0.6)];
  }

  static _pCrystalFlanked(z) {
    const gap = 130, w = 200, h = 480;
    return [
      new GlassPanel(-w/2-gap, 0, z, w, h),
      new Crystal(0, 0, z),
      new GlassPanel( w/2+gap, 0, z, w, h),
    ];
  }

  static _pCheckerboard(z) {
    const gap = 90, w = 200, h = 200, obs = [];
    for (let col = -1; col <= 1; col += 2)
      for (let row = -1; row <= 1; row += 2)
        obs.push(new GlassPanel(col*(w/2+gap/2), row*(h/2+gap/2), z, w, h));
    return obs;
  }

  static _pSpinBlade(z, diff) {
    return [new SpinBlade(0, 0, z, 260, 30, 1.2+diff*0.4)];
  }

  static _pDualSpin(z, diff) {
    const speed = 1.0 + diff * 0.5;
    return [new SpinBlade(-220, 0, z, 200, 25, speed), new SpinBlade(220, 0, z, 200, 25, -speed)];
  }

  static _pGauntlet(z, diff) {
    const obs = [], slices = 3 + Math.floor(diff), step = 320;
    for (let i = 0; i < slices; i++) {
      const side = Math.random() < 0.5 ? -1 : 1, gap = 80, w = 210, h = 500;
      obs.push(
        new GlassPanel(side*(w/2+gap/2), 0, z+i*step, w, h),
        new GlassPanel(-side*(w/2+gap/2), 0, z+i*step, w, h),
      );
      if (i === Math.floor(slices/2)) obs.push(new Crystal(0, 0, z+i*step+step/2));
    }
    return obs;
  }

  static _pZigzag(z) {
    const obs = [], step = 350, w = 280, h = 500, gap = 80;
    for (let i = 0; i < 3; i++) {
      const side = i%2===0 ? -1 : 1;
      obs.push(
        new GlassPanel(side*(w/2+gap/2), 0, z+i*step, w, h),
        new GlassPanel(-side*(w/2+gap/2), 0, z+i*step, w, h),
      );
    }
    return obs;
  }

  static sectionDepth(obstacles, defaultDepth = 700) {
    if (!obstacles.length) return defaultDepth;
    return Math.max(...obstacles.map(o => o.z)) - Math.min(...obstacles.map(o => o.z)) + defaultDepth;
  }
}
