export class Vector {
  constructor(public x: number = 0, public y: number = 0) {}

  add(v: Vector): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n: number): this {
    this.x *= n;
    this.y *= n;
    return this;
  }

  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): this {
    const m = this.mag();
    if (m > 0) this.mult(1 / m);
    return this;
  }

  copy(): Vector {
    return new Vector(this.x, this.y);
  }

  static sub(v1: Vector, v2: Vector): Vector {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  static dist(v1: Vector, v2: Vector): number {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
  }
}
