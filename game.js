const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lifespanBarEl = document.getElementById('lifespan-bar');
const bossHealthEl = document.getElementById('boss-health');

// Vector Utility Class
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const m = this.mag();
        if (m > 0) this.mult(1 / m);
        return this;
    }
    copy() { return new Vector(this.x, this.y); }
    static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
    static dist(v1, v2) { return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2); }
}

// Particles
class Particle {
    constructor(pos, vel, color, life) {
        this.pos = pos.copy();
        this.vel = vel.copy();
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 3 + 1;
    }
    update(dt) {
        this.pos.add(this.vel.copy().mult(dt));
        this.life -= dt;
    }
    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class ParticleSystem {
    constructor() { this.particles = []; }
    emit(pos, color, count = 5, speedRange = [50, 150]) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
            const vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.particles.push(new Particle(pos, vel, color, Math.random() * 0.5 + 0.2));
        }
    }
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }
    }
    draw(ctx) { this.particles.forEach(p => p.draw(ctx)); }
}

// Camera
class Camera {
    constructor() {
        this.offset = new Vector(0, 0);
        this.shakeAmount = 0;
    }
    shake(intensity) { this.shakeAmount = Math.max(this.shakeAmount, intensity); }
    update(dt) {
        if (this.shakeAmount > 0) {
            this.offset.x = (Math.random() - 0.5) * this.shakeAmount;
            this.offset.y = (Math.random() - 0.5) * this.shakeAmount;
            this.shakeAmount *= Math.pow(0.01, dt); // Decay over time
            if (this.shakeAmount < 0.5) this.shakeAmount = 0;
        } else {
            this.offset.mult(0);
        }
    }
    apply(ctx) { ctx.translate(this.offset.x, this.offset.y); }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

class Bullet {
    constructor(pos, vel, color = 'white', radius = 5) {
        this.pos = pos.copy();
        this.vel = vel.copy();
        this.radius = radius;
        this.color = color;
    }
    update(dt) { this.pos.add(this.vel.copy().mult(dt)); }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class HomingMissile {
    constructor(pos, target) {
        this.pos = pos.copy();
        this.vel = new Vector(0, 0);
        this.target = target;
        this.speed = 250;
        this.radius = 8;
        this.lifetime = 4;
        this.trailTimer = 0;
    }
    update(dt, particles) {
        const toTarget = Vector.sub(this.target.pos, this.pos).normalize();
        const steer = toTarget.mult(this.speed);
        // Soft homing: interpolate velocity
        this.vel.x += (steer.x - this.vel.x) * 3 * dt;
        this.vel.y += (steer.y - this.vel.y) * 3 * dt;
        
        this.pos.add(this.vel.copy().mult(dt));
        this.lifetime -= dt;

        this.trailTimer += dt;
        if (this.trailTimer > 0.05) {
            particles.emit(this.pos, '#ff9900', 1, [10, 30]);
            this.trailTimer = 0;
        }
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff9900';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.closePath();
    }
}

class Player {
    constructor() {
        this.pos = new Vector(canvas.width / 2, canvas.height - 100);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        this.radius = 15;
        this.speed = 2500; // Acceleration force
        this.friction = 0.15;
        this.maxSpeed = 500;
        this.lifespan = 100;
        this.maxLifespan = 100;
        this.bullets = [];
        this.shootCooldown = 0;
        this.blinkFrames = 0;
        this.scale = new Vector(1, 1);
    }

    update(dt) {
        this.acc.mult(0);
        if (keys['ArrowUp'] || keys['KeyW']) this.acc.y -= this.speed;
        if (keys['ArrowDown'] || keys['KeyS']) this.acc.y += this.speed;
        if (keys['ArrowLeft'] || keys['KeyA']) this.acc.x -= this.speed;
        if (keys['ArrowRight'] || keys['KeyD']) this.acc.x += this.speed;

        this.vel.add(this.acc.copy().mult(dt));
        this.vel.mult(Math.pow(this.friction, dt));
        this.pos.add(this.vel.copy().mult(dt));

        // Boundary checks
        if (this.pos.x < this.radius) { this.pos.x = this.radius; this.vel.x *= -0.5; }
        if (this.pos.x > canvas.width - this.radius) { this.pos.x = canvas.width - this.radius; this.vel.x *= -0.5; }
        if (this.pos.y < this.radius) { this.pos.y = this.radius; this.vel.y *= -0.5; }
        if (this.pos.y > canvas.height - this.radius) { this.pos.y = canvas.height - this.radius; this.vel.y *= -0.5; }

        if (keys['Space'] && this.shootCooldown <= 0) {
            this.bullets.push(new Bullet(new Vector(this.pos.x, this.pos.y - this.radius), new Vector(0, -800)));
            this.shootCooldown = 0.15;
            this.scale.y = 1.5; this.scale.x = 0.7; // Squash and stretch
        }
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.blinkFrames > 0) this.blinkFrames -= dt;

        this.scale.x += (1 - this.scale.x) * 10 * dt;
        this.scale.y += (1 - this.scale.y) * 10 * dt;

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(dt);
            if (this.bullets[i].pos.y < 0) this.bullets.splice(i, 1);
        }
    }

    draw(ctx) {
        if (this.blinkFrames > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;
        
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.scale(this.scale.x, this.scale.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4d4d';
        ctx.fill();
        ctx.closePath();
        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
    }
}

class Boss {
    constructor(player) {
        this.player = player;
        this.pos = new Vector(canvas.width / 2, 150);
        this.vel = new Vector(150, 50);
        this.radius = 90;
        this.health = 1000;
        this.maxHealth = 1000;
        this.attackTimer = 0;
        this.bullets = [];
        this.missiles = [];
        this.blinkFrames = 0;
        this.time = 0;
        this.scale = new Vector(1, 1);
    }

    update(dt, particles) {
        this.time += dt;
        
        // Organic hover movement
        const hoverX = Math.sin(this.time * 0.5) * 200;
        const hoverY = Math.cos(this.time * 0.8) * 50;
        const targetX = canvas.width / 2 + hoverX;
        const targetY = 200 + hoverY;

        this.pos.x += (targetX - this.pos.x) * 1.5 * dt;
        this.pos.y += (targetY - this.pos.y) * 1.5 * dt;

        if (this.blinkFrames > 0) this.blinkFrames -= dt;

        this.attackTimer += dt;
        if (this.attackTimer > 2.0 && this.attackTimer < 2.1) {
            this.shootMissile();
            this.attackTimer = 2.1; 
        } else if (this.attackTimer >= 4.0) {
            this.shootAreaAttack();
            this.attackTimer = 0;
            this.scale.x = 1.2; this.scale.y = 1.2;
        }

        this.scale.x += (1 - this.scale.x) * 5 * dt;
        this.scale.y += (1 - this.scale.y) * 5 * dt;

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(dt);
            if (Vector.dist(this.bullets[i].pos, new Vector(canvas.width/2, canvas.height/2)) > 2000) {
                this.bullets.splice(i, 1);
            }
        }
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            this.missiles[i].update(dt, particles);
            if (this.missiles[i].lifetime <= 0) this.missiles.splice(i, 1);
        }
    }

    shootAreaAttack() {
        const num = 12;
        for (let i = 0; i < num; i++) {
            const angle = (i / num) * Math.PI * 2;
            this.bullets.push(new Bullet(this.pos, new Vector(Math.cos(angle) * 300, Math.sin(angle) * 300), '#4d4dff', 10));
        }
    }

    shootMissile() { this.missiles.push(new HomingMissile(this.pos, this.player)); }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.scale(this.scale.x, this.scale.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.blinkFrames > 0 ? 'white' : '#4d4dff';
        ctx.fill();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#4d4dff';
        ctx.stroke();
        ctx.closePath();
        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
        this.missiles.forEach(m => m.draw(ctx));
    }
}

const player = new Player();
const boss = new Boss(player);
const particles = new ParticleSystem();
const camera = new Camera();

function checkCollision(obj1, obj2) {
    return Vector.dist(obj1.pos || obj1, obj2.pos || obj2) < (obj1.radius + obj2.radius);
}

let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap dt to avoid huge jumps
    lastTime = timestamp;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (player.lifespan > 0 && boss.health > 0) {
        player.update(dt);
        boss.update(dt, particles);
        particles.update(dt);
        camera.update(dt);

        // Collision: Player bullets -> Boss
        player.bullets.forEach((b, i) => {
            if (checkCollision(b, boss)) {
                boss.health -= 10;
                boss.blinkFrames = 0.05;
                boss.scale.x = 1.05; boss.scale.y = 0.95;
                particles.emit(b.pos, 'white', 8);
                player.bullets.splice(i, 1);
                camera.shake(2);
            }
        });

        // Collision: Boss attacks -> Player
        boss.bullets.forEach((b, i) => {
            if (checkCollision(b, player)) {
                player.lifespan -= 10;
                player.blinkFrames = 0.5;
                particles.emit(b.pos, '#4d4dff', 10);
                boss.bullets.splice(i, 1);
                camera.shake(10);
            }
        });

        boss.missiles.forEach((m, i) => {
            if (checkCollision(m, player)) {
                player.lifespan -= 20;
                player.blinkFrames = 0.5;
                particles.emit(m.pos, '#ff9900', 15);
                boss.missiles.splice(i, 1);
                camera.shake(15);
            }
        });

        if (checkCollision(player, boss)) {
            player.lifespan -= 10 * dt;
            if (player.blinkFrames <= 0) player.blinkFrames = 0.1;
        }

        // HUD Update
        lifespanBarEl.style.width = Math.max(0, (player.lifespan / player.maxLifespan) * 100) + '%';
        bossHealthEl.textContent = Math.max(0, Math.floor(boss.health));
    }

    ctx.save();
    camera.apply(ctx);
    
    particles.draw(ctx);
    player.draw(ctx);
    boss.draw(ctx);
    
    ctx.restore();

    if (player.lifespan <= 0) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 64px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('MISSION FAILED', canvas.width / 2, canvas.height / 2);
    } else if (boss.health <= 0) {
        ctx.fillStyle = '#4d4dff';
        ctx.font = 'bold 64px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET ELIMINATED', canvas.width / 2, canvas.height / 2);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
