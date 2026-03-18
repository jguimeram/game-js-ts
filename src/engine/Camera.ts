import { Vector } from './Vector';

export class Camera {
  public offset: Vector = new Vector(0, 0);
  public shakeAmount: number = 0;
  public flash: number = 0;
  public zoom: number = 1;
  public targetZoom: number = 1;

  shake(intensity: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, intensity);
  }

  update(dt: number): void {
    if (this.shakeAmount > 0) {
      this.offset.x = (Math.random() - 0.5) * this.shakeAmount;
      this.offset.y = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= Math.pow(0.01, dt);
      if (this.shakeAmount < 0.5) this.shakeAmount = 0;
    } else {
      this.offset.mult(0);
    }

    if (this.flash > 0) this.flash -= dt;
    this.zoom += (this.targetZoom - this.zoom) * 3 * dt;
  }

  apply(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Center the zoom
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-width / 2, -height / 2);
    
    // Apply shake and offset
    ctx.translate(this.offset.x, this.offset.y);
  }

  screenToWorld(mx: number, my: number, width: number, height: number): Vector {
    const wx = (mx - width / 2 - this.offset.x) / this.zoom + width / 2;
    const wy = (my - height / 2 - this.offset.y) / this.zoom + height / 2;
    return new Vector(wx, wy);
  }

  drawFlash(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flash * 2})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
