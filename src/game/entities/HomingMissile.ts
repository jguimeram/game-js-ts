import { Vector } from '../../engine/Vector';
import { Entity } from './Entity';
import { Projectile } from './Projectile';
import { ParticleSystem } from '../../engine/ParticleSystem';

export class HomingMissile extends Projectile {
  public speed: number = 250;
  public lifetime: number = 4;
  private trailTimer: number = 0;

  constructor(
    pos: Vector,
    private target: Entity
  ) {
    super(pos, new Vector(0, 0), 8, '#ff9900');
  }

  update(dt: number, particles: ParticleSystem): void {
    const toTarget = Vector.sub(this.target.pos, this.pos).normalize();
    const steer = toTarget.mult(this.speed);

    // Soft homing: interpolate velocity
    this.vel.x += (steer.x - this.vel.x) * 3 * dt;
    this.vel.y += (steer.y - this.vel.y) * 3 * dt;

    this.pos.add(this.vel.copy().mult(dt));
    this.lifetime -= dt;

    this.trailTimer += dt;
    if (this.trailTimer > 0.05) {
      particles.emit(this.pos, '#ff9900', 1, [10, 30]);
      this.trailTimer = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.closePath();
  }
}
