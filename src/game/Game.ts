import { Player } from './entities/Player';
import { Boss, BossState } from './entities/Boss';
import { Minion } from './entities/Minion';
import { ParticleSystem } from '../engine/ParticleSystem';
import { Camera } from '../engine/Camera';
import { DamageNumber } from '../engine/DamageNumber';
import { Vector } from '../engine/Vector';
import { DamageArea } from './entities/DamageArea';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lifespanBarEl: HTMLElement;
  private bossHealthEl: HTMLElement;
  private timerEl: HTMLElement;
  private debugTooltipEl: HTMLElement;
  private gameOverOverlayEl: HTMLElement;
  private gameOverTitleEl: HTMLElement;
  private statTimeEl: HTMLElement;
  private statLifespanEl: HTMLElement;
  private statDamageEl: HTMLElement;

  private player: Player;
  private boss: Boss;
  private minions: Minion[] = [];
  private particles: ParticleSystem;
  private camera: Camera;
  private damageNumbers: DamageNumber[] = [];
  private damageAreas: DamageArea[] = [];
  private minionsSpawnedForCurrentThreshold: boolean = false;
  private mousePos: Vector = new Vector(0, 0);
  private environmentalHazardTimer: number = 0;
  private gameTime: number = 0;
  private totalDamageDealt: number = 0;
  private gameRunning: boolean = false;

  private skill1El: HTMLElement;
  private skill2El: HTMLElement;
  private skill2CooldownEl: HTMLElement;
  private skill2CooldownTimerEl: HTMLElement;
  private skill3El: HTMLElement;
  private skill3CooldownEl: HTMLElement;
  private skill3CooldownTimerEl: HTMLElement;

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
    this.timerEl = document.getElementById('game-timer')!;
    this.debugTooltipEl = document.getElementById('debug-tooltip')!;
    this.gameOverOverlayEl = document.getElementById('game-over-overlay')!;
    this.gameOverTitleEl = document.getElementById('game-over-title')!;
    this.statTimeEl = document.getElementById('stat-time')!;
    this.statLifespanEl = document.getElementById('stat-lifespan')!;
    this.statDamageEl = document.getElementById('stat-damage')!;

    this.skill1El = document.getElementById('skill-1')!;
    this.skill2El = document.getElementById('skill-2')!;
    this.skill2CooldownEl = this.skill2El.querySelector('.cooldown-overlay')!;
    this.skill2CooldownTimerEl = this.skill2El.querySelector('.cooldown-timer')!;
    this.skill3El = document.getElementById('skill-3')!;
    this.skill3CooldownEl = this.skill3El.querySelector('.cooldown-overlay')!;
    this.skill3CooldownTimerEl = this.skill3El.querySelector('.cooldown-timer')!;

    const resetBtn = document.getElementById('btn-reset');
    resetBtn?.addEventListener('click', () => this.resetToMenu());

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

  private resetToMenu(): void {
    this.gameRunning = false;
    this.gameOverOverlayEl.style.display = 'none';
    const menu = document.getElementById('menu-overlay');
    if (menu) menu.style.display = 'flex';
  }

  private initInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'ShiftLeft') {
        this.player.dash(this.keys, this.camera);
      }
      if (e.code === 'Digit1') this.player.activeSkill = 1;
      if (e.code === 'Digit2') this.player.activeSkill = 2;
      if (e.code === 'Digit3') {
          this.player.activeSkill = 3;
          // Reset healing progress when switching back to heal
          (this.player as any).healingTicks = 0; 
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
    if (code === 'KeyL') {
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
      [L] Toggle Debug
    `;
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public start(): void {
    this.lastTime = 0;
    this.gameTime = 0;
    this.totalDamageDealt = 0;
    this.gameRunning = true;
    this.gameOverOverlayEl.style.display = 'none';
    this.gameOverOverlayEl.classList.remove('active'); // In case you add transitions
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(timestamp: number): void {
    if (!this.gameRunning) return;
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
    const isGameOver = (this.player.lifespan <= 0 && !this.debug.godMode) || this.boss.isFullyDestroyed;

    if (!isGameOver) {
      this.gameTime += dtReal;
      this.updateCameraZoom();
      this.checkCollisions(dtReal);
      
      // Environmental hazards
      if (this.boss.health <= this.boss.maxHealth * 0.5) {
        this.environmentalHazardTimer += dt;
        if (this.environmentalHazardTimer >= 3.0) {
          this.damageAreas.push(new DamageArea(this.player.pos.copy(), this.player.radius * 3));
          this.environmentalHazardTimer = 0;
        }
      }
    } else {
      this.showGameOver();
    }

    // Keep entities and systems updating so animations/particles don't freeze
    const updateDt = isGameOver ? 0 : dt; // Stop movement but keep time? 
    // Wait, if I use 0, animations using dt stop. 
    // I will use dt for animations but handle movement/actions inside entities or here.
    
    // Better: let the entities update, but if game is over, they don't take input/attack
    this.player.update(
      isGameOver ? dt * 0.1 : dt, // Slow motion effect on game over? Or just dt.
      isGameOver ? {} : this.keys, // No keys = no movement
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
    if (!isGameOver && this.boss.state === BossState.STAGING && !this.minionsSpawnedForCurrentThreshold) {
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
      m.update(isGameOver ? 0 : dt, this.particles, this.canvas.width, this.canvas.height);

      if (m.health <= 0) {
        this.particles.emit(m.pos, '#7a4dff', 20);
        this.minions.splice(i, 1);
        if (this.minions.length === 0) {
          this.boss.state = BossState.IDLE;
          this.minionsSpawnedForCurrentThreshold = false;
        }
      }
    }

    for (let i = this.damageAreas.length - 1; i >= 0; i--) {
      const da = this.damageAreas[i];
      da.update(isGameOver ? 0 : dt, this.particles);
      if (da.isDone) {
        this.damageAreas.splice(i, 1);
      }
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
        const damage = 8;
        this.boss.takeDamage(damage);
        this.totalDamageDealt += damage;
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
            const damage = 25;
            m.health -= damage;
            this.totalDamageDealt += damage;
            m.blinkFrames = 0.05;
            this.particles.emit(b.pos, '#7a4dff', 5);
            this.damageNumbers.push(new DamageNumber(b.pos, '25', '#7a4dff', 24));
            this.player.bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    // Player magic spells -> Boss/Minions
    for (let i = this.player.magicSpells.length - 1; i >= 0; i--) {
      const ms = this.player.magicSpells[i];
      if (!ms) continue;
      if (this.boss.state !== BossState.STAGING && ms.checkCollision(this.boss)) {
        const damage = ms.damage;
        this.boss.takeDamage(damage);
        this.totalDamageDealt += damage;
        this.boss.scale.x = 1.3;
        this.boss.scale.y = 0.7;
        this.particles.emit(ms.pos, '#ff4dff', 20);
        this.damageNumbers.push(new DamageNumber(ms.pos, damage.toString(), '#ff4dff', 48));
        this.player.magicSpells.splice(i, 1);
        this.camera.shake(10);
      } else {
        for (let j = this.minions.length - 1; j >= 0; j--) {
          const m = this.minions[j];
          if (ms.checkCollision(m)) {
            const damage = ms.damage;
            m.health -= damage;
            this.totalDamageDealt += damage;
            m.blinkFrames = 0.05;
            this.particles.emit(ms.pos, '#ff4dff', 15);
            this.damageNumbers.push(new DamageNumber(ms.pos, damage.toString(), '#ff4dff', 32));
            this.player.magicSpells.splice(i, 1);
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

      // Damage areas -> Player
      for (const da of this.damageAreas) {
        if (da.isActive() && !da.hasDealtDamage && da.checkCollision(this.player)) {
          this.player.lifespan -= 20;
          this.player.blinkFrames = 0.5;
          this.particles.emit(this.player.pos, '#ff4d4d', 20);
          this.damageNumbers.push(new DamageNumber(this.player.pos, '20', '#ff4d4d', 32));
          this.camera.shake(10);
          da.hasDealtDamage = true;
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

  private showGameOver(): void {
    if (this.gameOverOverlayEl.style.display === 'flex') return;
    
    this.gameOverOverlayEl.style.display = 'flex';
    const isWin = this.boss.health <= 0;
    this.gameOverTitleEl.textContent = isWin ? 'TARGET ELIMINATED' : 'MISSION FAILED';
    this.gameOverTitleEl.style.color = isWin ? '#ff4dff' : '#ff4d4d';
    
    this.statTimeEl.textContent = `TIME: ${this.formatTime(this.gameTime)}`;
    const lifespanPercent = Math.max(0, Math.floor((this.player.lifespan / this.player.maxLifespan) * 100));
    this.statLifespanEl.textContent = `REMAINING LIFESPAN: ${lifespanPercent}%`;
    this.statDamageEl.textContent = `TOTAL DAMAGE DEALT: ${Math.floor(this.totalDamageDealt)}`;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private updateHUD(): void {
    const lifespanPercent = this.debug.godMode ? 100 : (this.player.lifespan / this.player.maxLifespan) * 100;
    this.lifespanBarEl.style.width = Math.max(0, lifespanPercent) + '%';
    
    if (this.player.isHealing) {
        this.lifespanBarEl.classList.add('healing');
        this.skill3El.classList.add('healing');
    } else {
        this.lifespanBarEl.classList.remove('healing');
        this.skill3El.classList.remove('healing');
    }

    this.skill1El.classList.toggle('active', this.player.activeSkill === 1);
    this.skill2El.classList.toggle('active', this.player.activeSkill === 2);
    this.skill3El.classList.toggle('active', this.player.activeSkill === 3);

    // Skill 2 (Magic) Cooldown
    const magicCdPercent = (this.player.magicSkillCooldown / this.player.maxMagicSkillCooldown) * 100;
    this.skill2CooldownEl.style.height = `${magicCdPercent}%`;
    this.skill2CooldownTimerEl.textContent = this.player.magicSkillCooldown > 0 
        ? Math.ceil(this.player.magicSkillCooldown).toString() 
        : '';

    // Skill 3 (Repair) Cooldown
    const repairCdPercent = (this.player.healingCooldown / this.player.maxHealingCooldown) * 100;
    this.skill3CooldownEl.style.height = `${repairCdPercent}%`;
    this.skill3CooldownTimerEl.textContent = this.player.healingCooldown > 0 
        ? Math.ceil(this.player.healingCooldown).toString() 
        : '';

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

    this.timerEl.textContent = this.formatTime(this.gameTime);
  }

  private draw(): void {
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.camera.apply(this.ctx, this.canvas.width, this.canvas.height);

    this.particles.draw(this.ctx);
    this.damageAreas.forEach((da) => da.draw(this.ctx));
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
}
