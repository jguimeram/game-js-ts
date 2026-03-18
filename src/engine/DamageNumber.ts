import { Vector } from './Vector';

export class DamageNumber {
  public pos: Vector;
  public velocity: Vector;
  public life: number = 1.0;
  public maxLife: number = 1.0;
  public opacity: number = 1.0;

  constructor(
    pos: Vector,
    public value: string,
    public color: string = 'white',
    public size: number = 24
  ) {
    this.pos = pos.copy();
    // Random upward float
    this.velocity = new Vector((Math.random() - 0.5) * 50, -100 - Math.random() * 50);
  }

  update(dt: number): void {
    this.pos.add(this.velocity.copy().mult(dt));
    this.velocity.y += 200 * dt; // Slight gravity/deceleration
    this.life -= dt;
    this.opacity = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px 'Courier New'`;
    ctx.textAlign = 'center';
    
    // Add a slight outline for readability
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeText(this.value, this.pos.x, this.pos.y);
    ctx.fillText(this.value, this.pos.x, this.pos.y);
    
    ctx.restore();
  }
}
