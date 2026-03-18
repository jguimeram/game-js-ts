import { Vector } from '../../engine/Vector';

export abstract class Entity {
  constructor(
    public pos: Vector,
    public radius: number = 0
  ) {}

  abstract update(dt: number, ...args: any[]): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  drawHitbox(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  checkCollision(other: Entity): boolean {
    return Vector.dist(this.pos, other.pos) < this.radius + other.radius;
  }
}
