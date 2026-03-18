import { Vector } from '../../engine/Vector';
import { Entity } from './Entity';
import { ParticleSystem } from '../../engine/ParticleSystem';

export class DamageArea extends Entity {
  public timer: number = 0;
  public telegraphDuration: number = 1.0;
  public activeDuration: number = 5.0;
  public isDone: boolean = false;
  public hasDealtDamage: boolean = false;

  constructor(pos: Vector, radius: number) {
    super(pos, radius);
  }

  update(dt: number, particles: ParticleSystem): void {
    this.timer += dt;

    if (this.timer >= this.telegraphDuration && this.timer < this.telegraphDuration + this.activeDuration) {
      if (Math.random() > 0.5) {
        particles.emit(this.pos, '#ff4d4d', 2, [50, 150]);
      }
    }

    if (this.timer >= this.telegraphDuration + this.activeDuration) {
      this.isDone = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    if (this.timer < this.telegraphDuration) {
      // Telegraphing
      const progress = this.timer / this.telegraphDuration;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 77, 77, ${0.2 + progress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      
      // Inner filling circle
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 77, 77, 0.2)`;
      ctx.fill();
    } else {
      // Active
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 77, 77, 0.6)`;
      ctx.fill();
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    ctx.restore();
  }

  isActive(): boolean {
    return this.timer >= this.telegraphDuration && this.timer < this.telegraphDuration + this.activeDuration;
  }
}
