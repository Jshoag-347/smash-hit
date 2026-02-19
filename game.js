'use strict';

const STARTING_BALLS       = 10;
const BALL_RADIUS          = 22;
const BALL_SPEED           = 2400;
const CAMERA_SPEED_INITIAL = 320;
const CAMERA_SPEED_MAX     = 1100;
const CAMERA_ACCEL         = 8;
const SECTION_INTERVAL     = 900;
const MAX_BALLS_IN_FLIGHT  = 12;
const PENALTY_BALLS        = 10;
const CRYSTAL_REWARD_BALLS = 3;
const SCORE_PER_UNIT       = 0.015;

class Game {
  constructor() {
    this.canvas   = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.particles= new ParticleSystem();
    this.state       = 'menu';
    this.balls       = STARTING_BALLS;
    this.score       = 0;
    this.bestScore   = parseInt(localStorage.getItem('smashHitBest') || '0', 10);
    this.cameraZ     = 0;
    this.cameraSpeed = CAMERA_SPEED_INITIAL;
    this.distance    = 0;
    this.hitFlash    = 0;
    this.multiplier  = 1;
    this.projectiles = [];
    this.obstacles   = [];
    this.mouseX = this.canvas.width  / 2;
    this.mouseY = this.canvas.height / 2;
    this.nextSectionZ    = 600;
    this.difficultyLevel = 0;
    this._lastTime = 0;
    this._bindEvents();
    this._resize();
    requestAnimationFrame(t => this._loop(t));
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
    });
    this.canvas.addEventListener('click', e => this._onShoot(e));
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = t.clientX - r.left;
      this.mouseY = t.clientY - r.top;
      this._onShoot({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyP' || e.code === 'Escape') this._togglePause();
    });
    document.getElementById('start-btn')  .addEventListener('click', () => this._startGame());
    document.getElementById('restart-btn').addEventListener('click', () => this._startGame());
    document.getElementById('resume-btn') .addEventListener('click', () => this._togglePause());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.renderer.resize();
  }

  _startGame() {
    this.state = 'playing';
    this.balls = STARTING_BALLS; this.score = 0;
    this.cameraZ = 0; this.cameraSpeed = CAMERA_SPEED_INITIAL;
    this.distance = 0; this.hitFlash = 0;
    this.projectiles = []; this.obstacles = [];
    this.particles = new ParticleSystem();
    this.nextSectionZ = 600; this.difficultyLevel = 0;
    for (let i = 0; i < 5; i++) this._spawnNextSection();
    this._showScreen(null);
    this._updateHUD();
  }

  _gameOver() {
    this.state = 'gameover';
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('smashHitBest', String(this.bestScore));
    }
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-distance').textContent = Math.floor(this.distance/100)+'m';
    document.getElementById('best-score').textContent = this.bestScore;
    this._showScreen('gameover-screen');
  }

  _togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused'; this._showScreen('pause-screen');
    } else if (this.state === 'paused') {
      this.state = 'playing'; this._showScreen(null);
      this._lastTime = performance.now();
    }
  }

  _showScreen(id) {
    for (const sid of ['start-screen', 'gameover-screen', 'pause-screen']) {
      const el = document.getElementById(sid);
      if (el) {
        if (sid === id) el.classList.remove('hidden');
        else            el.classList.add('hidden');
      }
    }
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;
    if (this.state === 'playing') this._update(dt);
    this.renderer.renderFrame({
      cameraZ: this.cameraZ, obstacles: this.obstacles,
      projectiles: this.projectiles, particles: this.particles,
      hitFlash: this.hitFlash, mouseX: this.mouseX, mouseY: this.mouseY,
    });
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this.cameraZ     += this.cameraSpeed * dt;
    this.cameraSpeed  = Math.min(CAMERA_SPEED_MAX, this.cameraSpeed + CAMERA_ACCEL * dt);
    this.distance     = this.cameraZ;
    this.score        = Math.floor(this.cameraZ * SCORE_PER_UNIT);
    this.difficultyLevel = this.cameraZ / 8000;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    for (const obs of this.obstacles) obs.update(dt);
    this._updateProjectiles(dt);
    this._checkCollisions();
    this._checkPenalties();
    this.particles.update(dt);
    while (this.nextSectionZ < this.cameraZ + 4000) this._spawnNextSection();
    this.obstacles   = this.obstacles.filter(o => o.z > this.cameraZ - 300);
    this.projectiles = this.projectiles.filter(b => b.active && b.z < this.cameraZ + 5000);
    this._updateHUD();
  }

  _updateProjectiles(dt) {
    for (const ball of this.projectiles) {
      if (!ball.active) continue;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
    }
  }

  _onShoot(e) {
    if (this.state !== 'playing') return;
    if (this.balls <= 0) return;
    if (this.projectiles.filter(b => b.active).length >= MAX_BALLS_IN_FLIGHT) return;
    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    const dx = (clickX - cx) / FOV, dy = -(clickY - cy) / FOV, dz = 1;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    this.projectiles.push({
      x: 0, y: 0, z: this.cameraZ + NEAR_CLIP * 0.5,
      vx: (dx/len)*BALL_SPEED, vy: (dy/len)*BALL_SPEED, vz: (dz/len)*BALL_SPEED,
      radius: BALL_RADIUS, active: true,
    });
    this.balls--;
    if (this.balls < 0) this.balls = 0;
    this._updateHUD();
    if (this.balls === 0) {
      setTimeout(() => { if (this.balls === 0 && this.state === 'playing') this._gameOver(); }, 2500);
    }
  }

  _checkCollisions() {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      for (const ball of this.projectiles) {
        if (!ball.active) continue;
        if (obs.intersectsBall(ball)) { this._handleCollision(ball, obs); break; }
      }
    }
  }

  _handleCollision(ball, obs) {
    if (obs.type === 'crystal') {
      obs.active = false; ball.active = false;
      this.balls = Math.min(99, this.balls + CRYSTAL_REWARD_BALLS);
      this.particles.spawnCrystalBurst(obs.x, obs.y, obs.z);
      this._showPopup(obs, `+${CRYSTAL_REWARD_BALLS}`, 'gain');
      this._updateHUD();
    } else if (obs.type === 'spinblade') {
      obs.hitsLeft--;
      this.particles.spawnGlassBurst(ball.x, ball.y, ball.z, 18);
      ball.active = false;
      if (obs.hitsLeft <= 0) { obs.active = false; this.particles.spawnGlassBurst(obs.x, obs.y, obs.z, 35); }
    } else {
      obs.active = false; ball.active = false;
      this.particles.spawnGlassBurst(obs.x, obs.y, obs.z);
    }
  }

  _checkPenalties() {
    for (const obs of this.obstacles) {
      if (obs.penalised || !obs.active) continue;
      if (obs.type === 'crystal') {
        if (obs.z < this.cameraZ) { obs.active = false; obs.penalised = true; }
        continue;
      }
      if (obs.z < this.cameraZ) {
        obs.penalised = true;
        this.balls = Math.max(0, this.balls - PENALTY_BALLS);
        this.hitFlash = 1;
        this.particles.spawnHitBurst(this.canvas.width/2, this.canvas.height/2);
        this._updateHUD();
        if (this.balls <= 0) this._gameOver();
      }
    }
  }

  _spawnNextSection() {
    const z   = this.nextSectionZ;
    const obs = LevelGenerator.generateSection(z, this.difficultyLevel);
    this.obstacles.push(...obs);
    this.nextSectionZ += LevelGenerator.sectionDepth(obs, 700);
  }

  _updateHUD() {
    document.getElementById('balls-count').textContent = this.balls;
    document.getElementById('score-value').textContent = this.score;
  }

  _showPopup(obs, text, type) {
    const p  = this.renderer.project(obs.x, obs.y, obs.z, this.cameraZ);
    const sx = p ? p.x : this.canvas.width  / 2;
    const sy = p ? p.y : this.canvas.height / 2;
    const el = document.createElement('div');
    el.className = `popup ${type}`; el.textContent = text;
    el.style.left = `${sx-20}px`; el.style.top = `${sy-20}px`;
    document.getElementById('popups').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
}

window.addEventListener('DOMContentLoaded', () => { window._game = new Game(); });
