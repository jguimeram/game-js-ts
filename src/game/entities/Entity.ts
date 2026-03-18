import { Vector } from '../../engine/Vector';

export abstract class Entity {
  constructor(
    public pos: Vector,
    public radius: number = 0
  ) {}

  abstract update(dt: number, ...args: any[]): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  checkCollision(other: Entity): boolean {
    return Vector.dist(this.pos, other.pos) < this.radius + other.radius;
  }
}
