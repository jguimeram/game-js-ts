import { Vector } from './Vector';

export class Particle {
  public maxLife: number;
  public size: number;

  constructor(
    public pos: Vector,
    public vel: Vector,
    public color: string,
    public life: number
  ) {
    this.pos = pos.copy();
    this.vel = vel.copy();
    this.maxLife = life;
    this.size = Math.random() * 3 + 1;
  }

  update(dt: number): void {
    this.pos.add(this.vel.copy().mult(dt));
    this.life -= dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

export class ParticleSystem {
  public particles: Particle[] = [];

  emit(
    pos: Vector,
    color: string,
    count: number = 5,
    speedRange: [number, number] = [50, 150]
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
      const vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.particles.push(
        new Particle(pos, vel, color, Math.random() * 0.5 + 0.2)
      );
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;
      p.update(dt);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((p) => p.draw(ctx));
  }
}
