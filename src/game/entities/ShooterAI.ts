import { Vector } from '../../engine/Vector';
import { Player } from './Player';
import { Boss } from './Boss';
import { ParticleSystem } from '../../engine/ParticleSystem';
import { Camera } from '../../engine/Camera';

export class ShooterAI extends Player {
  private targetDist: number = 400;

  constructor(width: number, height: number) {
    super(width, height);
    this.pos = new Vector(width * 0.7, height * 0.7);
  }

  updateAI(
    dt: number,
    boss: Boss,
    minions: any[],
    particles: ParticleSystem,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const fakeKeys: Record<string, boolean> = {};
    
    // 1. Target Selection (Nearest Minion or Boss)
    let currentTarget: any = boss;
    let minDist = Vector.dist(this.pos, boss.pos);

    for (const m of minions) {
      const d = Vector.dist(this.pos, m.pos);
      if (d < minDist) {
        minDist = d;
        currentTarget = m;
      }
    }

    const mousePos = currentTarget.pos.copy();

    // 2. Steering: Maintain distance from current target
    const toTarget = Vector.sub(currentTarget.pos, this.pos);
    const dist = toTarget.mag();
    const dir = toTarget.copy().normalize();

    if (dist > this.targetDist + 50) {
      fakeKeys['KeyW'] = true;
      if (dir.x > 0.2) fakeKeys['KeyD'] = true;
      if (dir.x < -0.2) fakeKeys['KeyA'] = true;
    } else if (dist < this.targetDist - 50) {
      fakeKeys['KeyS'] = true;
      if (dir.x > 0.2) fakeKeys['KeyA'] = true;
      if (dir.x < -0.2) fakeKeys['KeyD'] = true;
    }

    // 3. Dodging: Check nearby projectiles
    let closestProj: any = null;
    let minProjDist = 150;

    for (const b of boss.bullets) {
      const d = Vector.dist(this.pos, b.pos);
      if (d < minProjDist) {
        minProjDist = d;
        closestProj = b;
      }
    }

    for (const m of boss.missiles) {
      const d = Vector.dist(this.pos, m.pos);
      if (d < minProjDist) {
        minProjDist = d;
        closestProj = m;
      }
    }

    if (closestProj) {
      // Flee from projectile
      const fleeDir = Vector.sub(this.pos, closestProj.pos).normalize();
      if (fleeDir.x > 0.3) fakeKeys['KeyD'] = true;
      if (fleeDir.x < -0.3) fakeKeys['KeyA'] = true;
      if (fleeDir.y > 0.3) fakeKeys['KeyS'] = true;
      if (fleeDir.y < -0.3) fakeKeys['KeyW'] = true;

      // Dash if very close
      if (minProjDist < 60 && this.dashCooldown <= 0) {
        this.dash(fakeKeys, camera);
      }
    }

    // 3. Combat: Use skills
    fakeKeys['Space'] = true;
    if (this.magicSkillCooldown <= 0) {
        this.activeSkill = 2;
    } else {
        this.activeSkill = 1;
    }

    // Call base update with our fake inputs
    super.update(dt, fakeKeys, mousePos, particles, canvasWidth, canvasHeight);
  }
}
