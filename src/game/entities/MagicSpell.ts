import { Vector } from '../../engine/Vector';
import { Projectile } from './Projectile';

export class MagicSpell extends Projectile {
  public damage: number = 25;
  constructor(
    pos: Vector,
    vel: Vector
  ) {
    // 2 times bigger than player size (player radius is 15)
    super(pos, vel, 30, '#ff4dff');
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    
    // Glowing effect for magic spell
    const gradient = ctx.createRadialGradient(
      this.pos.x, this.pos.y, this.radius * 0.2,
      this.pos.x, this.pos.y, this.radius
    );
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(0.4, '#ff4dff');
    gradient.addColorStop(1, 'rgba(255, 77, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff4dff';
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }
}
