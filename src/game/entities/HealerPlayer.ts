import { Vector } from '../../engine/Vector';
import { Entity } from './Entity';
import { ParticleSystem } from '../../engine/ParticleSystem';

export class HealerPlayer extends Entity {
  public vel: Vector = new Vector(0, 0);
  public acc: Vector = new Vector(0, 0);
  public speed: number = 3200;
  public friction: number = 0.05;
  public stopFriction: number = 0.0001;
  public maxSpeed: number = 550;
  public lifespan: number = 100;
  public maxLifespan: number = 100;
  public blinkFrames: number = 0;
  public scale: Vector = new Vector(1, 1);

  public rayActive: boolean = false;
  public rayTarget: Vector | null = null;
  public rayHittingShooter: boolean = false;

  public burstHealCooldown: number = 0;
  public maxBurstHealCooldown: number = 10;
  
  public healingTicks: number = 0; // Added to avoid crash in Game.ts
  public dashCooldown: number = 0; // Added for UI
  public dashIFrame: number = 0;

  constructor(width: number, height: number) {
    super(new Vector(width / 2, height - 100), 15);
  }

  dash(): void {
    // Healer doesn't have dash yet, but method must exist to avoid crash
  }

  update(
    dt: number,
    keys: Record<string, boolean>,
    mousePos: Vector,
    particles: ParticleSystem,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // 1. Movement Logic (Standard)
    this.acc.mult(0);
    const isMoving = keys['ArrowUp'] || keys['KeyW'] || keys['ArrowDown'] || keys['KeyS'] || keys['ArrowLeft'] || keys['KeyA'] || keys['ArrowRight'] || keys['KeyD'];

    if (keys['ArrowUp'] || keys['KeyW']) this.acc.y -= this.speed;
    if (keys['ArrowDown'] || keys['KeyS']) this.acc.y += this.speed;
    if (keys['ArrowLeft'] || keys['KeyA']) this.acc.x -= this.speed;
    if (keys['ArrowRight'] || keys['KeyD']) this.acc.x += this.speed;

    this.vel.add(this.acc.copy().mult(dt));
    const currentFriction = isMoving ? this.friction : this.stopFriction;
    this.vel.mult(Math.pow(currentFriction, dt));

    if (this.vel.mag() > this.maxSpeed) {
      this.vel.normalize().mult(this.maxSpeed);
    }
    this.pos.add(this.vel.copy().mult(dt));

    // 2. Skill Logic: Green Ray (Space)
    this.rayActive = !!keys['Space'];
    this.rayTarget = mousePos.copy();

    // 3. Skill Logic: Burst Heal (Digit2)
    if (keys['Digit2'] && this.burstHealCooldown <= 0) {
      // Logic handled in Game.ts for target detection
      this.burstHealCooldown = this.maxBurstHealCooldown;
    }
    if (this.burstHealCooldown > 0) this.burstHealCooldown -= dt;

    if (this.blinkFrames > 0) this.blinkFrames -= dt;

    // 4. Boundary checks
    if (this.pos.x < this.radius) this.pos.x = this.radius;
    if (this.pos.x > canvasWidth - this.radius) this.pos.x = canvasWidth - this.radius;
    if (this.pos.y < this.radius) this.pos.y = this.radius;
    if (this.pos.y > canvasHeight - this.radius) this.pos.y = canvasHeight - this.radius;

    this.scale.x += (1 - this.scale.x) * 12 * dt;
    this.scale.y += (1 - this.scale.y) * 12 * dt;

    if (this.rayActive && Math.random() > 0.5) {
      particles.emit(this.pos, '#00ff00', 1, [20, 100]);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.blinkFrames > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;

    // Draw Ray
    if (this.rayActive && this.rayTarget) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(this.rayTarget.x, this.rayTarget.y);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff00';
      ctx.stroke();
      ctx.closePath();
      
      // Core beam
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(this.rayTarget.x, this.rayTarget.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.scale(this.scale.x, this.scale.y);

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff00';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.closePath();
    ctx.restore();
  }
}
