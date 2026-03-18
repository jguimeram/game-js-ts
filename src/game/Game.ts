import { Player } from './entities/Player';
import { Boss, BossState } from './entities/Boss';
import { Minion } from './entities/Minion';
import { ParticleSystem } from '../engine/ParticleSystem';
import { Camera } from '../engine/Camera';
import { DamageNumber } from '../engine/DamageNumber';
import { Vector } from '../engine/Vector';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lifespanBarEl: HTMLElement;
  private bossHealthEl: HTMLElement;
  private debugTooltipEl: HTMLElement;

  private player: Player;
  private boss: Boss;
  private minions: Minion[] = [];
  private particles: ParticleSystem;
  private camera: Camera;
  private damageNumbers: DamageNumber[] = [];
  private minionsSpawnedForCurrentThreshold: boolean = false;
  private mousePos: Vector = new Vector(0, 0);

  private debug = {
    enabled: false,
    godMode: false,
    showHitboxes: false,
    timeScale: 1,
  };

  private keys: Record<string, boolean> = {};
  private lastTime: number = 0;
  private hitStopTimer: number = 0;

  constructor(debugEnabled: boolean = false) {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.lifespanBarEl = document.getElementById('lifespan-bar')!;
    this.bossHealthEl = document.getElementById('boss-health')!;
    this.debugTooltipEl = document.getElementById('debug-tooltip')!;

    this.debug.enabled = debugEnabled;
    this.updateDebugTooltip();

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
      this.handleDebugInput(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mousePos = this.camera.screenToWorld(
        e.clientX,
        e.clientY,
        this.canvas.width,
        this.canvas.height
      );
    });
  }

  private handleDebugInput(code: string): void {
    if (code === 'Backquote') {
      this.debug.enabled = !this.debug.enabled;
    }

    if (!this.debug.enabled) {
      this.updateDebugTooltip();
      return;
    }

    switch (code) {
      case 'KeyG':
        this.debug.godMode = !this.debug.godMode;
        break;
      case 'KeyK':
        this.boss.takeDamage(250);
        break;
      case 'KeyH':
        this.debug.showHitboxes = !this.debug.showHitboxes;
        break;
      case 'KeyT':
        this.debug.timeScale = this.debug.timeScale === 1 ? 5 : 1;
        break;
    }
    this.updateDebugTooltip();
  }

  private updateDebugTooltip(): void {
    if (!this.debug.enabled) {
      this.debugTooltipEl.style.display = 'none';
      return;
    }

    this.debugTooltipEl.style.display = 'block';
    this.debugTooltipEl.innerHTML = `
      <b>DEBUG MODE ACTIVE</b>
      God Mode: ${this.debug.godMode ? 'ON' : 'OFF'}
      Hitboxes: ${this.debug.showHitboxes ? 'ON' : 'OFF'}
      Time Scale: ${this.debug.timeScale}x
      ---
      [G] God Mode | [H] Hitboxes
      [T] Time Scale | [K] Dmg Boss
      [\`] Toggle Debug
    `;
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

    let dt = dtReal * this.debug.timeScale;
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtReal;
      dt = 0;
    }

    this.update(dt, dtReal);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number, dtReal: number): void {
    const isGameOver = (this.player.lifespan <= 0 && !this.debug.godMode) || this.boss.health <= 0;

    if (!isGameOver) {
      this.player.update(
        dt,
        this.keys,
        this.mousePos,
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

      // Minion staging logic
      if (this.boss.state === BossState.STAGING && !this.minionsSpawnedForCurrentThreshold) {
        console.log("Boss entered STAGING state");
        for (let i = 0; i < 3; i++) {
          const x = Math.random() * this.canvas.width;
          const y = 100 + Math.random() * (this.canvas.height / 2);
          this.minions.push(new Minion(new Vector(x, y), this.player));
          this.particles.emit(new Vector(x, y), '#7a4dff', 10);
        }
        this.minionsSpawnedForCurrentThreshold = true;
      }

      for (let i = this.minions.length - 1; i >= 0; i--) {
        const m = this.minions[i];
        m.update(dt, this.particles, this.canvas.width, this.canvas.height);

        if (m.health <= 0) {
          this.particles.emit(m.pos, '#7a4dff', 20);
          this.minions.splice(i, 1);
          if (this.minions.length === 0) {
            this.boss.state = BossState.IDLE;
            this.minionsSpawnedForCurrentThreshold = false;
          }
        }
      }
      
      this.updateCameraZoom();
      this.checkCollisions(dtReal);
    }

    this.particles.update(dt);
    this.camera.update(dtReal);

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      this.damageNumbers[i].update(dt);
      if (this.damageNumbers[i].life <= 0) this.damageNumbers.splice(i, 1);
    }

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
      if (this.boss.state !== BossState.STAGING && b.checkCollision(this.boss)) {
        this.boss.takeDamage(8);
        this.boss.scale.x = 1.1;
        this.boss.scale.y = 0.9;
        this.particles.emit(b.pos, 'white', 5);
        this.damageNumbers.push(new DamageNumber(b.pos, '8', 'white', 32));
        this.player.bullets.splice(i, 1);
        this.camera.shake(1);
      } else {
        // Player bullets -> Minions
        for (let j = this.minions.length - 1; j >= 0; j--) {
          const m = this.minions[j];
          if (b.checkCollision(m)) {
            m.health -= 25;
            m.blinkFrames = 0.05;
            this.particles.emit(b.pos, '#7a4dff', 5);
            this.damageNumbers.push(new DamageNumber(b.pos, '25', '#7a4dff', 24));
            this.player.bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    // Boss attacks -> Player
    if (this.player.dashIFrame <= 0 && !this.debug.godMode) {
      // Minion bullets -> Player
      for (const m of this.minions) {
        for (let i = m.bullets.length - 1; i >= 0; i--) {
          const mb = m.bullets[i];
          if (mb.checkCollision(this.player)) {
            this.player.lifespan -= 5;
            this.player.blinkFrames = 0.5;
            this.particles.emit(mb.pos, '#7a4dff', 5);
            this.damageNumbers.push(new DamageNumber(mb.pos, '5', '#7a4dff', 20));
            m.bullets.splice(i, 1);
            this.camera.shake(2);
          }
        }
      }

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
    const lifespanPercent = this.debug.godMode ? 100 : (this.player.lifespan / this.player.maxLifespan) * 100;
    this.lifespanBarEl.style.width = Math.max(0, lifespanPercent) + '%';
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
    this.minions.forEach((m) => m.draw(this.ctx));
    this.damageNumbers.forEach((d) => d.draw(this.ctx));

    if (this.debug.showHitboxes) {
      this.player.drawHitbox(this.ctx);
      this.boss.drawHitbox(this.ctx);
      this.minions.forEach((m) => m.drawHitbox(this.ctx));
    }

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
    if (this.player.lifespan <= 0 && !this.debug.godMode) {
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
