import { Player } from './entities/Player';
import { HealerPlayer } from './entities/HealerPlayer';
import { ShooterAI } from './entities/ShooterAI';
import { Boss, BossState } from './entities/Boss';

export enum GameMode {
  NORMAL = 'NORMAL',
  HEALER = 'HEALER',
}
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
  private healer: HealerPlayer | null = null;
  private shooterAI: ShooterAI | null = null;
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
  private mode: GameMode = GameMode.NORMAL;

  private shooterHealthHudEl: HTMLElement | null = null;
  private shooterLifespanBarEl: HTMLElement | null = null;

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

  constructor(debugEnabled: boolean = false, mode: GameMode = GameMode.NORMAL) {
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

    this.shooterHealthHudEl = document.getElementById('shooter-hud');
    this.shooterLifespanBarEl = document.getElementById('shooter-lifespan-bar');

    const resetBtn = document.getElementById('btn-reset');
    resetBtn?.addEventListener('click', () => this.resetToMenu());

    this.debug.enabled = debugEnabled;
    this.mode = mode;
    this.updateDebugTooltip();

    this.resize();
    window.addEventListener('resize', () => this.resize());

    if (this.mode === GameMode.HEALER) {
      this.healer = new HealerPlayer(this.canvas.width, this.canvas.height);
      this.shooterAI = new ShooterAI(this.canvas.width, this.canvas.height);
      this.player = this.healer as any; 
      this.boss = new Boss(this.shooterAI, this.canvas.width);
      if (this.shooterHealthHudEl) this.shooterHealthHudEl.style.display = 'block';
    } else {
      this.player = new Player(this.canvas.width, this.canvas.height);
      this.boss = new Boss(this.player, this.canvas.width);
      if (this.shooterHealthHudEl) this.shooterHealthHudEl.style.display = 'none';
    }

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
      
      const activeEntity: any = this.mode === GameMode.HEALER ? this.healer : this.player;

      if (e.code === 'ShiftLeft') {
        activeEntity?.dash(this.keys, this.camera);
      }
      if (e.code === 'Digit1') activeEntity.activeSkill = 1;
      if (e.code === 'Digit2') activeEntity.activeSkill = 2;
      if (e.code === 'Digit3') {
          activeEntity.activeSkill = 3;
          if (activeEntity) activeEntity.healingTicks = 0; 
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
    let isGameOver = (this.player.lifespan <= 0 && !this.debug.godMode) || this.boss.isFullyDestroyed;
    if (this.mode === GameMode.HEALER && this.shooterAI && this.shooterAI.lifespan <= 0) {
      isGameOver = true;
    }

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
    
    if (this.mode === GameMode.HEALER && this.healer && this.shooterAI) {
      this.healer.update(
        isGameOver ? dt * 0.1 : dt,
        isGameOver ? {} : this.keys,
        this.mousePos,
        this.particles,
        this.canvas.width,
        this.canvas.height
      );

      this.shooterAI.updateAI(
        isGameOver ? dt * 0.1 : dt,
        this.boss,
        this.particles,
        this.camera,
        this.canvas.width,
        this.canvas.height
      );

      // HEALING RAY LOGIC
      if (!isGameOver && this.healer.rayActive && this.healer.rayTarget) {
        // Distance check between ray segment and shooterAI
        const p1 = this.healer.pos;
        const p2 = this.healer.rayTarget;
        const p3 = this.shooterAI.pos;
        
        // Ray hitting shooter check
        const lineDist = this.distToSegment(p3, p1, p2);
        if (lineDist < this.shooterAI.radius + 10) {
          this.shooterAI.lifespan = Math.min(this.shooterAI.maxLifespan, this.shooterAI.lifespan + 8 * dt);
          this.healer.rayHittingShooter = true;
          if (Math.random() > 0.5) this.particles.emit(this.shooterAI.pos, '#00ff00', 1);
        } else {
          this.healer.rayHittingShooter = false;
          // Self heal if not hitting shooter
          this.healer.lifespan = Math.min(this.healer.maxLifespan, this.healer.lifespan + 8 * dt);
        }

        // BURST HEAL Logic (Skill 2)
        if (this.keys['Digit2'] && this.healer.burstHealCooldown === this.healer.maxBurstHealCooldown) {
          const distToShooter = Vector.dist(this.mousePos, this.shooterAI.pos);
          const distToHealer = Vector.dist(this.mousePos, this.healer.pos);
          
          if (distToShooter < 100) {
            this.shooterAI.lifespan = Math.min(this.shooterAI.maxLifespan, this.shooterAI.lifespan + 20);
            this.particles.emit(this.shooterAI.pos, '#00ff00', 30, [100, 200]);
            this.damageNumbers.push(new DamageNumber(this.shooterAI.pos, '20', '#00ff00', 40));
          } else if (distToHealer < 100) {
            this.healer.lifespan = Math.min(this.healer.maxLifespan, this.healer.lifespan + 20);
            this.particles.emit(this.healer.pos, '#00ff00', 30, [100, 200]);
            this.damageNumbers.push(new DamageNumber(this.healer.pos, '20', '#00ff00', 40));
          }
        }
      }
    } else {
      this.player.update(
        isGameOver ? dt * 0.1 : dt,
        isGameOver ? {} : this.keys,
        this.mousePos,
        this.particles,
        this.canvas.width,
        this.canvas.height
      );
    }

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

  private distToSegment(p: Vector, v: Vector, w: Vector): number {
    const l2 = Vector.distSq(v, w);
    if (l2 === 0) return Vector.dist(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Vector.dist(p, new Vector(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y)));
  }

  private updateCameraZoom(): void {
    if (this.boss.state === BossState.TELEGRAPH) this.camera.targetZoom = 1.05;
    else if (this.boss.state === BossState.SURGE) this.camera.targetZoom = 1.15;
    else this.camera.targetZoom = 1.0;
  }

  private checkCollisions(dtReal: number): void {
    const shooters = [this.player];
    if (this.mode === GameMode.HEALER && this.shooterAI) shooters.push(this.shooterAI);

    for (const s of shooters) {
      // Player/Shooter bullets -> Boss
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        if (!b) continue;
        if (this.boss.state !== BossState.STAGING && b.checkCollision(this.boss)) {
          const damage = 8;
          this.boss.takeDamage(damage);
          this.totalDamageDealt += damage;
          this.boss.scale.x = 1.1;
          this.boss.scale.y = 0.9;
          this.particles.emit(b.pos, 'white', 5);
          this.damageNumbers.push(new DamageNumber(b.pos, '8', 'white', 32));
          s.bullets.splice(i, 1);
          this.camera.shake(1);
        } else {
          // Player/Shooter bullets -> Minions
          for (let j = this.minions.length - 1; j >= 0; j--) {
            const m = this.minions[j];
            if (b.checkCollision(m)) {
              const damage = 25;
              m.health -= damage;
              this.totalDamageDealt += damage;
              m.blinkFrames = 0.05;
              this.particles.emit(b.pos, '#7a4dff', 5);
              this.damageNumbers.push(new DamageNumber(b.pos, '25', '#7a4dff', 24));
              s.bullets.splice(i, 1);
              break;
            }
          }
        }
      }

      // Player/Shooter magic spells -> Boss/Minions
      for (let i = s.magicSpells.length - 1; i >= 0; i--) {
        const ms = s.magicSpells[i];
        if (!ms) continue;
        if (this.boss.state !== BossState.STAGING && ms.checkCollision(this.boss)) {
          const damage = 25;
          this.boss.takeDamage(damage);
          this.totalDamageDealt += damage;
          this.boss.scale.x = 1.3;
          this.boss.scale.y = 0.7;
          this.particles.emit(ms.pos, '#ff4dff', 20);
          this.damageNumbers.push(new DamageNumber(ms.pos, '25', '#ff4dff', 48));
          s.magicSpells.splice(i, 1);
          this.camera.shake(10);
        } else {
          for (let j = this.minions.length - 1; j >= 0; j--) {
            const m = this.minions[j];
            if (ms.checkCollision(m)) {
              const damage = 25;
              m.health -= damage;
              this.totalDamageDealt += damage;
              m.blinkFrames = 0.05;
              this.particles.emit(ms.pos, '#ff4dff', 15);
              this.damageNumbers.push(new DamageNumber(ms.pos, '25', '#ff4dff', 32));
              s.magicSpells.splice(i, 1);
              break;
            }
          }
        }
      }
    }

    // Boss attacks -> Player/Healer/Shooter
    const targets = [this.player];
    if (this.mode === GameMode.HEALER && this.shooterAI) targets.push(this.shooterAI);

    for (const target of targets) {
      if (target.dashIFrame > 0 || (target === this.player && this.debug.godMode)) continue;

      // Minion bullets -> target
      for (const m of this.minions) {
        for (let i = m.bullets.length - 1; i >= 0; i--) {
          const mb = m.bullets[i];
          if (mb.checkCollision(target)) {
            target.lifespan -= 5;
            target.blinkFrames = 0.5;
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
        if (b.checkCollision(target)) {
          target.lifespan -= 10;
          target.blinkFrames = 0.5;
          this.particles.emit(b.pos, '#4d4dff', 10);
          this.damageNumbers.push(new DamageNumber(b.pos, '10', '#4d4dff', 24));
          this.boss.bullets.splice(i, 1);
          this.camera.shake(10);
          if (target === this.player) this.hitStopTimer = 0.05;
        }
      }

      for (let i = this.boss.missiles.length - 1; i >= 0; i--) {
        const m = this.boss.missiles[i];
        if (!m) continue;
        if (m.checkCollision(target)) {
          target.lifespan -= 15;
          target.blinkFrames = 0.5;
          this.particles.emit(m.pos, '#ff9900', 15);
          this.damageNumbers.push(new DamageNumber(m.pos, '15', '#ff9900', 28));
          this.boss.missiles.splice(i, 1);
          this.camera.shake(15);
          if (target === this.player) this.hitStopTimer = 0.08;
        }
      }

      // Damage areas -> target
      for (const da of this.damageAreas) {
        if (da.isActive() && !da.hasDealtDamage && da.checkCollision(target)) {
          target.lifespan -= 20;
          target.blinkFrames = 0.5;
          this.particles.emit(target.pos, '#ff4d4d', 20);
          this.damageNumbers.push(new DamageNumber(target.pos, '20', '#ff4d4d', 32));
          this.camera.shake(10);
          da.hasDealtDamage = true;
        }
      }

      if (target.checkCollision(this.boss)) {
        target.lifespan -= 30 * dtReal;
        if (target.blinkFrames <= 0) {
          target.blinkFrames = 0.1;
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
    
    const isHealing = this.mode === GameMode.HEALER ? false : this.player.isHealing;
    
    if (isHealing) {
        this.lifespanBarEl.classList.add('healing');
        this.skill3El.classList.add('healing');
    } else {
        this.lifespanBarEl.classList.remove('healing');
        this.skill3El.classList.remove('healing');
    }

    if (this.mode === GameMode.HEALER && this.healer && this.shooterAI) {
      const shooterLifespanPercent = (this.shooterAI.lifespan / this.shooterAI.maxLifespan) * 100;
      if (this.shooterLifespanBarEl) {
        this.shooterLifespanBarEl.style.width = Math.max(0, shooterLifespanPercent) + '%';
        this.shooterLifespanBarEl.classList.toggle('healing', this.healer.rayHittingShooter);
      }

      this.skill1El.classList.toggle('active', true); // Ray is always selected in healer mode? Or based on keys. 
      // User said skill 1 is space, skill 2 is num2.
      this.skill1El.classList.toggle('active', this.healer.rayActive);
      this.skill2El.classList.toggle('active', true);
      this.skill3El.style.display = 'none';

      // Skill 2 (Burst Heal) Cooldown
      const burstCdPercent = (this.healer.burstHealCooldown / this.healer.maxBurstHealCooldown) * 100;
      this.skill2CooldownEl.style.height = `${burstCdPercent}%`;
      this.skill2CooldownTimerEl.textContent = this.healer.burstHealCooldown > 0 
          ? Math.ceil(this.healer.burstHealCooldown).toString() 
          : '';
          
      this.skill1El.querySelector('.key')!.textContent = 'SPACE';
      this.skill1El.childNodes[2].textContent = ' HEAL RAY';
      this.skill2El.querySelector('.key')!.textContent = '2';
      this.skill2El.childNodes[2].textContent = ' BURST HEAL';

    } else {
      this.skill1El.classList.toggle('active', this.player.activeSkill === 1);
      this.skill2El.classList.toggle('active', this.player.activeSkill === 2);
      this.skill3El.classList.toggle('active', this.player.activeSkill === 3);
      this.skill3El.style.display = 'block';

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

      this.skill1El.querySelector('.key')!.textContent = '1';
      this.skill1El.childNodes[2].textContent = ' STRIKE';
      this.skill2El.querySelector('.key')!.textContent = '2';
      this.skill2El.childNodes[2].textContent = ' MAGIC';
    }

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
    if (this.mode === GameMode.HEALER && this.shooterAI) {
      this.shooterAI.draw(this.ctx);
    }
    this.boss.draw(this.ctx);
    this.minions.forEach((m) => m.draw(this.ctx));
    this.damageNumbers.forEach((d) => d.draw(this.ctx));

    if (this.debug.showHitboxes) {
      this.player.drawHitbox(this.ctx);
      if (this.mode === GameMode.HEALER && this.shooterAI) this.shooterAI.drawHitbox(this.ctx);
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
