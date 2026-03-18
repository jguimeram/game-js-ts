import { Vector } from '../../engine/Vector';
import { Entity } from './Entity';
import { Bullet } from './Bullet';
import { ParticleSystem } from '../../engine/ParticleSystem';
import { Player } from './Player';

export class Minion extends Entity {
  public health: number = 50;
  public vel: Vector = new Vector(0, 0);
  public speed: number = 150;
  public shootTimer: number = Math.random() * 2;
  public bullets: Bullet[] = [];
  public blinkFrames: number = 0;

  constructor(pos: Vector, private player: Player) {
    super(pos, 25);
  }

  update(dt: number, particles: ParticleSystem, canvasWidth: number, canvasHeight: number): void {
    // Move towards player slowly but stay at some distance
    const toPlayer = Vector.sub(this.player.pos, this.pos);
    const dist = toPlayer.mag();
    
    if (dist > 300) {
      this.vel = toPlayer.normalize().mult(this.speed);
    } else if (dist < 200) {
      this.vel = toPlayer.normalize().mult(-this.speed);
    } else {
      this.vel.mult(0.95); // Friction
    }

    this.pos.add(this.vel.copy().mult(dt));

    if (this.blinkFrames > 0) this.blinkFrames -= dt;

    // Shooting
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      const dir = Vector.sub(this.player.pos, this.pos).normalize();
      this.bullets.push(new Bullet(this.pos.copy(), dir.mult(400), '#7a4dff', 6));
      this.shootTimer = 2 + Math.random() * 2;
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].update(dt);
      const b = this.bullets[i];
      if (b.pos.x < 0 || b.pos.x > canvasWidth || b.pos.y < 0 || b.pos.y > canvasHeight) {
        this.bullets.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.blinkFrames > 0 ? 'white' : '#7a4dff';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#050505';
    ctx.fill();
    
    ctx.restore();
    
    this.bullets.forEach(b => b.draw(ctx));
  }
}
