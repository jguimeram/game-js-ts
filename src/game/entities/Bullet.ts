import { Vector } from '../../engine/Vector';
import { Projectile } from './Projectile';

export class Bullet extends Projectile {
  constructor(
    pos: Vector,
    vel: Vector,
    color: string = 'white',
    radius: number = 5
  ) {
    super(pos, vel, radius, color);
  }
}
