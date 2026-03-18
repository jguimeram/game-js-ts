import { Vector } from '../../engine/Vector';
import { Entity } from './Entity';

export abstract class Projectile extends Entity {
  constructor(
    pos: Vector,
    public vel: Vector,
    radius: number,
    public color: string
  ) {
    super(pos.copy(), radius);
  }

  update(dt: number, ..._args: any[]): void {
    this.pos.add(this.vel.copy().mult(dt));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }
}
