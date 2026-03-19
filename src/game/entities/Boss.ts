import { Vector } from '../../engine/Vector';
import { Entity } from './Entity';
import { Bullet } from './Bullet';
import { HomingMissile } from './HomingMissile';
import { ParticleSystem } from '../../engine/ParticleSystem';
import { Camera } from '../../engine/Camera';
import { Player } from './Player';

export enum BossState {
  IDLE = 'IDLE',
  TELEGRAPH = 'TELEGRAPH',
  SURGE = 'SURGE',
  STAGING = 'STAGING',
  DYING = 'DYING',
}

export class Boss extends Entity {
  public vel: Vector = new Vector(0, 0);
  public health: number = 1000;
  public maxHealth: number = 1000;
  public phase: number = 1;
  public attackTimer: number = 0;
  public bullets: Bullet[] = [];
  public missiles: HomingMissile[] = [];
  public blinkFrames: number = 0;
  public time: number = 0;
  public scale: Vector = new Vector(1, 1);
  public thresholdsReached: Set<number> = new Set();

  public state: BossState = BossState.IDLE;
  public stateTimer: number = 0;
  public maxStateTimer: number = 0;
  public targetPos: Vector;
  public telegraphColor: string = 'white';
  private pendingAttack: string = '';
  public isFullyDestroyed: boolean = false;
  public difficultyMultiplier: number = 1.0;

  public takeDamage(amount: number): void {
    if (this.state === BossState.DYING) return;
    this.health = Math.max(0, this.health - amount);
    this.blinkFrames = 0.05;
  }

  constructor(
    private player: Player,
    canvasWidth: number,
    difficultyMultiplier: number = 1.0
  ) {
    super(new Vector(canvasWidth / 2, -150), 90);
    this.targetPos = new Vector(canvasWidth / 2, 200);
    this.difficultyMultiplier = difficultyMultiplier;
    this.maxHealth = 1000 * difficultyMultiplier;
    this.health = this.maxHealth;
  }

  update(
    dt: number,
    particles: ParticleSystem,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (this.health <= 0 && this.state !== BossState.DYING) {
      this.state = BossState.DYING;
      this.stateTimer = 2.0;
      this.bullets = [];
      this.missiles = [];
    }

    this.time += dt;
    if (this.state !== BossState.DYING) {
      this.updatePhase(particles, camera);
      this.checkHealthThresholds();
    }

    const hpPercent = this.health / this.maxHealth;
    const isLastStand = hpPercent <= 0.25;

    if (this.state !== BossState.SURGE && this.state !== BossState.DYING && (this.state !== BossState.STAGING || isLastStand)) {
      const hoverX = Math.sin(this.time * 0.7) * (this.phase === 3 ? 400 : 200);
      const hoverY = Math.cos(this.time * 1.1) * 60;
      this.targetPos.x = canvasWidth / 2 + hoverX;
      this.targetPos.y = 200 + hoverY;

      this.pos.x += (this.targetPos.x - this.pos.x) * 1.5 * dt;
      this.pos.y += (this.targetPos.y - this.pos.y) * 1.5 * dt;
    } else if (this.state === BossState.STAGING) {
      // Stay on top right corner for 75% and 50% thresholds
      this.targetPos.x = canvasWidth - 150;
      this.targetPos.y = 150;
      this.pos.x += (this.targetPos.x - this.pos.x) * 2 * dt;
      this.pos.y += (this.targetPos.y - this.pos.y) * 2 * dt;
    }

    // Safety check to prevent disappearance
    if (isNaN(this.pos.x) || isNaN(this.pos.y)) {
      this.pos.x = canvasWidth / 2;
      this.pos.y = 200;
    }

    if (this.blinkFrames > 0) this.blinkFrames -= dt;

    switch (this.state) {
      case BossState.IDLE:
        this.attackTimer += dt;
        const baseThreshold = this.phase === 3 ? 1.5 : 2.5;
        const attackThreshold = baseThreshold / this.difficultyMultiplier;
        if (this.attackTimer > attackThreshold) {
          this.decideNextAttack();
          this.attackTimer = 0;
        }
        break;

      case BossState.TELEGRAPH:
        this.stateTimer -= dt;
        this.scale.x = 1 + Math.sin(this.time * 20) * 0.1;
        this.scale.y = 1 + Math.sin(this.time * 20) * 0.1;
        if (this.stateTimer <= 0) {
          this.executeAttack(camera);
        }
        break;

      case BossState.SURGE:
        this.pos.add(this.vel.copy().mult(dt));
        this.stateTimer -= dt;
        if (Math.random() > 0.3) particles.emit(this.pos, '#4d4dff', 2, [50, 200]);
        if (this.stateTimer <= 0) {
          this.state = BossState.IDLE;
          this.scale.x = 1.5;
          this.scale.y = 0.7;
        }
        break;
      case BossState.STAGING:
          if (isLastStand) {
            // At 25%, the boss also attacks while minions are out
            this.attackTimer += dt;
            if (this.attackTimer > 2.0) { // Slightly slower attacks during last stand adds
              this.decideNextAttack();
              this.attackTimer = 0;
            }
          }
          break;
      case BossState.DYING:
        this.stateTimer -= dt;
        this.blinkFrames = 0.05;
        this.scale.x = 1 + Math.sin(this.time * 30) * 0.2;
        this.scale.y = 1 + Math.cos(this.time * 30) * 0.2;
        
        if (Math.random() > 0.7) {
          const offset = new Vector(
            (Math.random() - 0.5) * this.radius * 2,
            (Math.random() - 0.5) * this.radius * 2
          );
          particles.emit(Vector.add(this.pos, offset), 'white', 5, [50, 150]);
          camera.shake(2);
        }

        if (this.stateTimer <= 0) {
          this.isFullyDestroyed = true;
          particles.emit(this.pos, '#ff4dff', 100, [100, 800]);
          camera.shake(30);
          camera.flash = 0.8;
        }
        break;
    }

    this.scale.x += (1 - this.scale.x) * 5 * dt;
    this.scale.y += (1 - this.scale.y) * 5 * dt;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b) continue;
      b.update(dt);
      if (b.pos.y > canvasHeight + 100 || b.pos.y < -100)
        this.bullets.splice(i, 1);
    }
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      if (!m) continue;
      m.update(dt, particles);
      if (m.lifetime <= 0) this.missiles.splice(i, 1);
    }
  }

  updatePhase(particles: ParticleSystem, camera: Camera): void {
    const hpPercent = this.health / this.maxHealth;
    let newPhase = 1;
    if (hpPercent < 0.33) newPhase = 3;
    else if (hpPercent < 0.66) newPhase = 2;

    if (newPhase !== this.phase) {
      this.phase = newPhase;
      camera.shake(20);
      camera.flash = 0.5;
      this.scale.mult(2);
      particles.emit(this.pos, '#4d4dff', 30, [200, 500]);
    }
  }

  checkHealthThresholds(): void {
    const hpPercent = this.health / this.maxHealth;
    [0.75, 0.5, 0.25].forEach((t) => {
      if (hpPercent <= t && !this.thresholdsReached.has(t)) {
        this.thresholdsReached.add(t);
        this.state = BossState.STAGING;
      }
    });
  }

  decideNextAttack(): void {
    const r = Math.random();
    if (r < 0.4) {
      this.startTelegraph(0.8, '#4d4dff', 'AREA');
    } else if (r < 0.7) {
      this.startTelegraph(1.0, '#ff9900', 'MISSILE');
    } else {
      this.startTelegraph(0.6, 'white', 'SURGE');
    }
  }

  startTelegraph(duration: number, color: string, type: string): void {
    this.state = BossState.TELEGRAPH;
    this.stateTimer = duration;
    this.maxStateTimer = duration;
    this.telegraphColor = color;
    this.pendingAttack = type;
  }

  executeAttack(camera: Camera): void {
    switch (this.pendingAttack) {
      case 'AREA':
        this.shootAreaAttack();
        this.state = BossState.IDLE;
        break;
      case 'MISSILE':
        this.shootMissile();
        if (this.phase >= 2) setTimeout(() => this.shootMissile(), 200);
        if (this.phase >= 3) setTimeout(() => this.shootMissile(), 400);
        this.state = BossState.IDLE;
        break;
      case 'SURGE':
        this.surgeAttack(camera);
        break;
    }
  }

  surgeAttack(camera: Camera): void {
    this.state = BossState.SURGE;
    const toPlayer = Vector.sub(this.player.pos, this.pos).normalize();
    this.vel = toPlayer.mult(1200);
    this.stateTimer = 0.6;
    camera.shake(10);
  }

  shootAreaAttack(): void {
    const num = this.phase === 1 ? 12 : this.phase === 2 ? 18 : 24;
    for (let i = 0; i < num; i++) {
      const angle = (i / num) * Math.PI * 2;
      const speed = this.phase === 3 ? 450 : 300;
      this.bullets.push(
        new Bullet(
          this.pos,
          new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed),
          '#4d4dff',
          10
        )
      );
    }
    this.scale.x = 1.3;
    this.scale.y = 1.3;
  }

  shootMissile(): void {
    this.missiles.push(new HomingMissile(this.pos, this.player));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.isFullyDestroyed) return;
    const hpPercent = this.health / this.maxHealth;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    if (this.state === BossState.TELEGRAPH) {
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        this.radius + 20 + Math.sin(this.time * 30) * 5,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = this.telegraphColor;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.closePath();
    }

    if (this.state === BossState.STAGING && hpPercent > 0.25) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 30, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 10;
      ctx.setLineDash([15, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.closePath();
    }

    ctx.scale(this.scale.x, this.scale.y);
    
    // Blinking effect logic
    if (this.state === BossState.DYING) {
        if (Math.floor(this.time * 20) % 2 === 0) {
            ctx.restore();
            this.bullets.forEach((b) => b.draw(ctx));
            this.missiles.forEach((m) => m.draw(ctx));
            return;
        }
    }

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);

    let bodyColor = '#4d4dff';
    if (this.phase === 2) bodyColor = '#7a4dff';
    if (this.phase === 3) bodyColor = '#ff4dff';

    ctx.fillStyle = this.blinkFrames > 0 ? 'white' : bodyColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 20, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();

    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cast Bar
    if (this.state === BossState.TELEGRAPH) {
      const barWidth = 120;
      const barHeight = 8;
      const progress = 1 - (this.stateTimer / this.maxStateTimer);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-barWidth / 2, -this.radius - 40, barWidth, barHeight);
      
      ctx.fillStyle = this.telegraphColor;
      ctx.fillRect(-barWidth / 2, -this.radius - 40, barWidth * progress, barHeight);
      
      // Label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(this.pendingAttack, 0, -this.radius - 45);
    }

    ctx.restore();

    this.bullets.forEach((b) => b.draw(ctx));
    this.missiles.forEach((m) => m.draw(ctx));
  }
}
