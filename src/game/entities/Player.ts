import { Vector } from '../../engine/Vector';
import { Entity } from './Entity';
import { Bullet } from './Bullet';
import { ParticleSystem } from '../../engine/ParticleSystem';
import { Camera } from '../../engine/Camera';

export class Player extends Entity {
  public vel: Vector = new Vector(0, 0);
  public acc: Vector = new Vector(0, 0);
  public speed: number = 3500;
  public friction: number = 0.05;
  public stopFriction: number = 0.0001;
  public maxSpeed: number = 600;
  public lifespan: number = 100;
  public maxLifespan: number = 100;
  public bullets: Bullet[] = [];
  public shootCooldown: number = 0;
  public blinkFrames: number = 0;
  public scale: Vector = new Vector(1, 1);

  public dashTimer: number = 0;
  public dashCooldown: number = 0;
  public isDashing: boolean = false;
  public dashIFrame: number = 0;

  constructor(width: number, height: number) {
    super(new Vector(width / 2, height - 100), 15);
  }

  dash(keys: Record<string, boolean>, camera: Camera): void {
    if (this.dashCooldown > 0) return;

    let dashDir = new Vector(0, 0);
    if (keys['ArrowUp'] || keys['KeyW']) dashDir.y -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dashDir.y += 1;
    if (keys['ArrowLeft'] || keys['KeyA']) dashDir.x -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dashDir.x += 1;

    if (dashDir.mag() === 0) dashDir.y = -1;
    dashDir.normalize().mult(1500);

    this.vel = dashDir;
    this.dashTimer = 0.2;
    this.dashCooldown = 0.8;
    this.dashIFrame = 0.25;
    this.isDashing = true;
    this.scale.x = 0.5;
    this.scale.y = 2.0;

    camera.shake(5);
  }

  update(
    dt: number,
    keys: Record<string, boolean>,
    mousePos: Vector,
    particles: ParticleSystem,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.acc.mult(0);
    const isMoving =
      keys['ArrowUp'] ||
      keys['KeyW'] ||
      keys['ArrowDown'] ||
      keys['KeyS'] ||
      keys['ArrowLeft'] ||
      keys['KeyA'] ||
      keys['ArrowRight'] ||
      keys['KeyD'];

    if (!this.isDashing) {
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
    } else {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

    this.pos.add(this.vel.copy().mult(dt));

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashIFrame > 0) this.dashIFrame -= dt;
    if (this.blinkFrames > 0) this.blinkFrames -= dt;

    // Boundary checks
    if (this.pos.x < this.radius) {
      this.pos.x = this.radius;
      this.vel.x *= -0.5;
    }
    if (this.pos.x > canvasWidth - this.radius) {
      this.pos.x = canvasWidth - this.radius;
      this.vel.x *= -0.5;
    }
    if (this.pos.y < this.radius) {
      this.pos.y = this.radius;
      this.vel.y *= -0.5;
    }
    if (this.pos.y > canvasHeight - this.radius) {
      this.pos.y = canvasHeight - this.radius;
      this.vel.y *= -0.5;
    }

    if (keys['Space'] && this.shootCooldown <= 0) {
      const dir = Vector.sub(mousePos, this.pos).normalize();
      this.bullets.push(
        new Bullet(
          this.pos.copy().add(dir.copy().mult(this.radius)),
          dir.mult(1000)
        )
      );
      this.shootCooldown = 0.12;
      this.scale.y = 1.4;
      this.scale.x = 0.8;
    }
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    this.scale.x += (1 - this.scale.x) * 12 * dt;
    this.scale.y += (1 - this.scale.y) * 12 * dt;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b) continue;
      b.update(dt);
      if (
        b.pos.x < -100 ||
        b.pos.x > canvasWidth + 100 ||
        b.pos.y < -100 ||
        b.pos.y > canvasHeight + 100
      ) {
        this.bullets.splice(i, 1);
      }
    }

    if (this.isDashing && Math.random() > 0.5) {
      particles.emit(this.pos, 'rgba(255, 77, 77, 0.5)', 2, [0, 50]);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.blinkFrames > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    if (this.vel.mag() > 10) {
      ctx.rotate(Math.atan2(this.vel.y, this.vel.x) + Math.PI / 2);
    }

    ctx.scale(this.scale.x, this.scale.y);

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.dashIFrame > 0 ? '#ffffff' : '#ff4d4d';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.closePath();
    ctx.restore();

    this.bullets.forEach((b) => b.draw(ctx));
  }
}
