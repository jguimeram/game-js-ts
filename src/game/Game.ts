import { Player } from './entities/Player';
import { Boss, BossState } from './entities/Boss';
import { ParticleSystem } from '../engine/ParticleSystem';
import { Camera } from '../engine/Camera';
import { DamageNumber } from '../engine/DamageNumber';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lifespanBarEl: HTMLElement;
  private bossHealthEl: HTMLElement;

  private player: Player;
  private boss: Boss;
  private particles: ParticleSystem;
  private camera: Camera;
  private damageNumbers: DamageNumber[] = [];

  private keys: Record<string, boolean> = {};
  private lastTime: number = 0;
  private hitStopTimer: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.lifespanBarEl = document.getElementById('lifespan-bar')!;
    this.bossHealthEl = document.getElementById('boss-health')!;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.player = new Player(this.canvas.width, this.canvas.height);
    this.boss = new Boss(this.player, this.canvas.width);
    this.particles = new ParticleSystem();
    this.camera = new Camera();

    this.lastTime = 0;
    this.initInput();
  }

  private initInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'ShiftLeft') {
        this.player.dash(this.keys, this.camera);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public start(): void {
    this.lastTime = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(timestamp: number): void {
    if (!this.lastTime) this.lastTime = timestamp;
    const dtReal = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    let dt = dtReal;
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtReal;
      dt = 0;
    }

    this.update(dt, dtReal);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number, dtReal: number): void {
    if (this.player.lifespan <= 0 || this.boss.health <= 0) return;

    this.player.update(
      dt,
      this.keys,
      this.particles,
      this.canvas.width,
      this.canvas.height
    );
    this.boss.update(
      dt,
      this.particles,
      this.camera,
      this.canvas.width,
      this.canvas.height
    );
    this.particles.update(dt);
    this.camera.update(dtReal);

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      this.damageNumbers[i].update(dt);
      if (this.damageNumbers[i].life <= 0) this.damageNumbers.splice(i, 1);
    }

    this.updateCameraZoom();
    this.checkCollisions(dtReal);
    this.updateHUD();
  }

  private updateCameraZoom(): void {
    if (this.boss.state === BossState.TELEGRAPH) this.camera.targetZoom = 1.05;
    else if (this.boss.state === BossState.SURGE) this.camera.targetZoom = 1.15;
    else this.camera.targetZoom = 1.0;
  }

  private checkCollisions(dtReal: number): void {
    // Player bullets -> Boss
    for (let i = this.player.bullets.length - 1; i >= 0; i--) {
      const b = this.player.bullets[i];
      if (!b) continue;
      if (b.checkCollision(this.boss)) {
        this.boss.health -= 8;
        this.boss.blinkFrames = 0.05;
        this.boss.scale.x = 1.1;
        this.boss.scale.y = 0.9;
        this.particles.emit(b.pos, 'white', 5);
        this.damageNumbers.push(new DamageNumber(b.pos, '8', 'white', 32));
        this.player.bullets.splice(i, 1);
        this.camera.shake(1);
      }
    }

    // Boss attacks -> Player
    if (this.player.dashIFrame <= 0) {
      for (let i = this.boss.bullets.length - 1; i >= 0; i--) {
        const b = this.boss.bullets[i];
        if (!b) continue;
        if (b.checkCollision(this.player)) {
          this.player.lifespan -= 10;
          this.player.blinkFrames = 0.5;
          this.particles.emit(b.pos, '#4d4dff', 10);
          this.damageNumbers.push(new DamageNumber(b.pos, '10', '#4d4dff', 24));
          this.boss.bullets.splice(i, 1);
          this.camera.shake(10);
          this.hitStopTimer = 0.05;
        }
      }

      for (let i = this.boss.missiles.length - 1; i >= 0; i--) {
        const m = this.boss.missiles[i];
        if (!m) continue;
        if (m.checkCollision(this.player)) {
          this.player.lifespan -= 15;
          this.player.blinkFrames = 0.5;
          this.particles.emit(m.pos, '#ff9900', 15);
          this.damageNumbers.push(new DamageNumber(m.pos, '15', '#ff9900', 28));
          this.boss.missiles.splice(i, 1);
          this.camera.shake(15);
          this.hitStopTimer = 0.08;
        }
      }

      if (this.player.checkCollision(this.boss)) {
        this.player.lifespan -= 30 * dtReal;
        if (this.player.blinkFrames <= 0) {
          this.player.blinkFrames = 0.1;
          this.camera.shake(5);
        }
      }
    }
  }

  private updateHUD(): void {
    this.lifespanBarEl.style.width =
      Math.max(0, (this.player.lifespan / this.player.maxLifespan) * 100) + '%';
    this.bossHealthEl.textContent = Math.max(
      0,
      Math.floor(this.boss.health)
    ).toString();
    this.bossHealthEl.style.color =
      this.boss.phase === 3
        ? '#ff4dff'
        : this.boss.phase === 2
          ? '#7a4dff'
          : '#4d4dff';
  }

  private draw(): void {
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.camera.apply(this.ctx, this.canvas.width, this.canvas.height);

    this.particles.draw(this.ctx);
    this.player.draw(this.ctx);
    this.boss.draw(this.ctx);
    this.damageNumbers.forEach((d) => d.draw(this.ctx));

    this.ctx.restore();

    this.camera.drawFlash(this.ctx, this.canvas.width, this.canvas.height);

    this.drawDashUI();
    this.drawGameOver();
  }

  private drawDashUI(): void {
    if (this.player.dashCooldown > 0) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fillRect(20, this.canvas.height - 40, 150, 10);
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(
        20,
        this.canvas.height - 40,
        (1 - this.player.dashCooldown / 0.8) * 150,
        10
      );
      this.ctx.font = '12px Courier New';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText('DASH READY', 20, this.canvas.height - 45);
    }
  }

  private drawGameOver(): void {
    if (this.player.lifespan <= 0) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 64px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        'MISSION FAILED',
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    } else if (this.boss.health <= 0) {
      this.ctx.fillStyle = '#ff4dff';
      this.ctx.font = 'bold 64px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        'TARGET ELIMINATED',
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }
  }
}
