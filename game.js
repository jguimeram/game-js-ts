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
        this.flash = 0;
        this.zoom = 1;
        this.targetZoom = 1;
    }
    shake(intensity) { this.shakeAmount = Math.max(this.shakeAmount, intensity); }
    update(dt) {
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
    apply(ctx) {
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-canvas.width/2, -canvas.height/2);
        ctx.translate(this.offset.x, this.offset.y);
    }
    drawFlash(ctx) {
        if (this.flash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flash * 2})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'ShiftLeft' && player.dashCooldown <= 0) player.dash();
});
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
        this.speed = 3500; // Increased acceleration
        this.friction = 0.05; // Base friction (higher = more slippery)
        this.stopFriction = 0.0001; // High friction when not moving for snappiness
        this.maxSpeed = 600;
        this.lifespan = 100;
        this.maxLifespan = 100;
        this.bullets = [];
        this.shootCooldown = 0;
        this.blinkFrames = 0;
        this.scale = new Vector(1, 1);
        
        // Dash properties
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.isDashing = false;
        this.dashIFrame = 0;
    }

    dash() {
        if (this.dashCooldown > 0) return;
        
        // Dash in movement direction, or forward if stationary
        let dashDir = new Vector(0, 0);
        if (keys['ArrowUp'] || keys['KeyW']) dashDir.y -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dashDir.y += 1;
        if (keys['ArrowLeft'] || keys['KeyA']) dashDir.x -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dashDir.x += 1;

        if (dashDir.mag() === 0) dashDir.y = -1; // Default dash up
        dashDir.normalize().mult(1500);
        
        this.vel = dashDir;
        this.dashTimer = 0.2;
        this.dashCooldown = 0.8;
        this.dashIFrame = 0.25;
        this.isDashing = true;
        this.scale.x = 0.5; this.scale.y = 2.0; // Extreme stretch
        
        camera.shake(5);
    }

    update(dt) {
        this.acc.mult(0);
        const isMoving = keys['ArrowUp'] || keys['KeyW'] || keys['ArrowDown'] || keys['KeyS'] || 
                         keys['ArrowLeft'] || keys['KeyA'] || keys['ArrowRight'] || keys['KeyD'];

        if (!this.isDashing) {
            if (keys['ArrowUp'] || keys['KeyW']) this.acc.y -= this.speed;
            if (keys['ArrowDown'] || keys['KeyS']) this.acc.y += this.speed;
            if (keys['ArrowLeft'] || keys['KeyA']) this.acc.x -= this.speed;
            if (keys['ArrowRight'] || keys['KeyD']) this.acc.x += this.speed;

            this.vel.add(this.acc.copy().mult(dt));
            
            // Snappy stops: Use higher friction if not providing input
            const currentFriction = isMoving ? this.friction : this.stopFriction;
            this.vel.mult(Math.pow(currentFriction, dt));
            
            // Cap speed
            if (this.vel.mag() > this.maxSpeed) {
                this.vel.normalize().mult(this.maxSpeed);
            }
        } else {
            // Dashing movement (bypass normal friction/accel)
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) this.isDashing = false;
        }

        this.pos.add(this.vel.copy().mult(dt));

        // Timers
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.dashIFrame > 0) this.dashIFrame -= dt;
        if (this.blinkFrames > 0) this.blinkFrames -= dt;

        // Boundary checks
        if (this.pos.x < this.radius) { this.pos.x = this.radius; this.vel.x *= -0.5; }
        if (this.pos.x > canvas.width - this.radius) { this.pos.x = canvas.width - this.radius; this.vel.x *= -0.5; }
        if (this.pos.y < this.radius) { this.pos.y = this.radius; this.vel.y *= -0.5; }
        if (this.pos.y > canvas.height - this.radius) { this.pos.y = canvas.height - this.radius; this.vel.y *= -0.5; }

        if (keys['Space'] && this.shootCooldown <= 0) {
            this.bullets.push(new Bullet(new Vector(this.pos.x, this.pos.y - this.radius), new Vector(0, -1000)));
            this.shootCooldown = 0.12;
            this.scale.y = 1.4; this.scale.x = 0.8;
        }
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        this.scale.x += (1 - this.scale.x) * 12 * dt;
        this.scale.y += (1 - this.scale.y) * 12 * dt;

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(dt);
            if (this.bullets[i].pos.y < -100) this.bullets.splice(i, 1);
        }

        // Ghost trail during dash
        if (this.isDashing && Math.random() > 0.5) {
            particles.emit(this.pos, 'rgba(255, 77, 77, 0.5)', 2, [0, 50]);
        }
    }

    draw(ctx) {
        if (this.blinkFrames > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;
        
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        
        // Rotate towards movement
        if (this.vel.mag() > 10) {
            ctx.rotate(Math.atan2(this.vel.y, this.vel.x) + Math.PI/2);
        }

        ctx.scale(this.scale.x, this.scale.y);
        
        // Body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.dashIFrame > 0 ? '#ffffff' : '#ff4d4d';
        ctx.fill();
        
        // Glowing core
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        ctx.closePath();
        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
    }
}

class Boss {
    constructor(player) {
        this.player = player;
        this.pos = new Vector(canvas.width / 2, -150); // Start off-screen for entry
        this.vel = new Vector(0, 0);
        this.radius = 90;
        this.health = 1000;
        this.maxHealth = 1000;
        this.phase = 1;
        this.attackTimer = 0;
        this.bullets = [];
        this.missiles = [];
        this.blinkFrames = 0;
        this.time = 0;
        this.scale = new Vector(1, 1);
        
        // State Machine
        this.states = { IDLE: 'IDLE', TELEGRAPH: 'TELEGRAPH', SURGE: 'SURGE' };
        this.state = this.states.IDLE;
        this.stateTimer = 0;
        this.targetPos = new Vector(canvas.width / 2, 200);
        this.telegraphColor = 'white';
    }

    update(dt, particles) {
        this.time += dt;
        this.updatePhase();

        // Base Movement (Hovering)
        if (this.state !== this.states.SURGE) {
            const hoverX = Math.sin(this.time * 0.7) * (this.phase === 3 ? 400 : 200);
            const hoverY = Math.cos(this.time * 1.1) * 60;
            this.targetPos.x = canvas.width / 2 + hoverX;
            this.targetPos.y = 200 + hoverY;

            this.pos.x += (this.targetPos.x - this.pos.x) * 1.5 * dt;
            this.pos.y += (this.targetPos.y - this.pos.y) * 1.5 * dt;
        }

        if (this.blinkFrames > 0) this.blinkFrames -= dt;

        // State Machine Logic
        switch (this.state) {
            case this.states.IDLE:
                this.attackTimer += dt;
                const attackThreshold = this.phase === 3 ? 1.5 : 2.5;
                if (this.attackTimer > attackThreshold) {
                    this.decideNextAttack();
                    this.attackTimer = 0;
                }
                break;

            case this.states.TELEGRAPH:
                this.stateTimer -= dt;
                this.scale.x = 1 + Math.sin(this.time * 20) * 0.1; // Shivering effect
                this.scale.y = 1 + Math.sin(this.time * 20) * 0.1;
                if (this.stateTimer <= 0) {
                    this.executeAttack();
                }
                break;

            case this.states.SURGE:
                this.pos.add(this.vel.copy().mult(dt));
                this.stateTimer -= dt;
                if (Math.random() > 0.3) particles.emit(this.pos, '#4d4dff', 2, [50, 200]);
                if (this.stateTimer <= 0) {
                    this.state = this.states.IDLE;
                    this.scale.x = 1.5; this.scale.y = 0.7; // Impact squash
                }
                break;
        }

        this.scale.x += (1 - this.scale.x) * 5 * dt;
        this.scale.y += (1 - this.scale.y) * 5 * dt;

        // Projectile updates
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(dt);
            if (this.bullets[i].pos.y > canvas.height + 100 || this.bullets[i].pos.y < -100) this.bullets.splice(i, 1);
        }
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            this.missiles[i].update(dt, particles);
            if (this.missiles[i].lifetime <= 0) this.missiles.splice(i, 1);
        }
    }

    updatePhase() {
        const hpPercent = this.health / this.maxHealth;
        let newPhase = 1;
        if (hpPercent < 0.33) newPhase = 3;
        else if (hpPercent < 0.66) newPhase = 2;

        if (newPhase !== this.phase) {
            this.phase = newPhase;
            camera.shake(20);
            camera.flash = 0.5;
            this.scale.mult(2);
            // Spawn some burst particles on phase change
            particles.emit(this.pos, '#4d4dff', 30, [200, 500]);
        }
    }

    decideNextAttack() {
        const r = Math.random();
        if (r < 0.4) {
            this.startTelegraph(0.8, '#4d4dff', 'AREA');
        } else if (r < 0.7) {
            this.startTelegraph(1.0, '#ff9900', 'MISSILE');
        } else {
            this.startTelegraph(0.6, 'white', 'SURGE');
        }
    }

    startTelegraph(duration, color, type) {
        this.state = this.states.TELEGRAPH;
        this.stateTimer = duration;
        this.telegraphColor = color;
        this.pendingAttack = type;
    }

    executeAttack() {
        switch (this.pendingAttack) {
            case 'AREA':
                this.shootAreaAttack();
                this.state = this.states.IDLE;
                break;
            case 'MISSILE':
                this.shootMissile();
                if (this.phase >= 2) setTimeout(() => this.shootMissile(), 200);
                if (this.phase >= 3) setTimeout(() => this.shootMissile(), 400);
                this.state = this.states.IDLE;
                break;
            case 'SURGE':
                this.surgeAttack();
                break;
        }
    }

    surgeAttack() {
        this.state = this.states.SURGE;
        const toPlayer = Vector.sub(this.player.pos, this.pos).normalize();
        this.vel = toPlayer.mult(1200);
        this.stateTimer = 0.6;
        camera.shake(10);
    }

    shootAreaAttack() {
        const num = this.phase === 1 ? 12 : (this.phase === 2 ? 18 : 24);
        for (let i = 0; i < num; i++) {
            const angle = (i / num) * Math.PI * 2;
            const speed = this.phase === 3 ? 450 : 300;
            this.bullets.push(new Bullet(this.pos, new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed), '#4d4dff', 10));
        }
        this.scale.x = 1.3; this.scale.y = 1.3;
    }

    shootMissile() { this.missiles.push(new HomingMissile(this.pos, this.player)); }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        // Telegraph ring
        if (this.state === this.states.TELEGRAPH) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 20 + Math.sin(this.time * 30) * 5, 0, Math.PI * 2);
            ctx.strokeStyle = this.telegraphColor;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.closePath();
        }

        ctx.scale(this.scale.x, this.scale.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        let bodyColor = '#4d4dff';
        if (this.phase === 2) bodyColor = '#7a4dff';
        if (this.phase === 3) bodyColor = '#ff4dff';
        
        ctx.fillStyle = this.blinkFrames > 0 ? 'white' : bodyColor;
        ctx.fill();
        
        // Eye/Core
        ctx.beginPath();
        ctx.arc(0, 20, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = bodyColor;
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
let hitStopTimer = 0;

function gameLoop(timestamp) {
    const dtReal = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    let dt = dtReal;
    if (hitStopTimer > 0) {
        hitStopTimer -= dtReal;
        dt = 0; // Freeze movement during hit-stop
    }

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (player.lifespan > 0 && boss.health > 0) {
        player.update(dt);
        boss.update(dt, particles);
        particles.update(dt);
        camera.update(dtReal);

        // Dynamic Camera Zoom
        if (boss.state === boss.states.TELEGRAPH) camera.targetZoom = 1.05;
        else if (boss.state === boss.states.SURGE) camera.targetZoom = 1.15;
        else camera.targetZoom = 1.0;

        // Collision: Player bullets -> Boss
        player.bullets.forEach((b, i) => {
            if (checkCollision(b, boss)) {
                boss.health -= 8;
                boss.blinkFrames = 0.05;
                boss.scale.x = 1.1; boss.scale.y = 0.9;
                particles.emit(b.pos, 'white', 5);
                player.bullets.splice(i, 1);
                camera.shake(1);
            }
        });

        // Collision: Boss attacks -> Player
        if (player.dashIFrame <= 0) {
            boss.bullets.forEach((b, i) => {
                if (checkCollision(b, player)) {
                    player.lifespan -= 10;
                    player.blinkFrames = 0.5;
                    particles.emit(b.pos, '#4d4dff', 10);
                    boss.bullets.splice(i, 1);
                    camera.shake(10);
                    hitStopTimer = 0.05;
                }
            });

            boss.missiles.forEach((m, i) => {
                if (checkCollision(m, player)) {
                    player.lifespan -= 15;
                    player.blinkFrames = 0.5;
                    particles.emit(m.pos, '#ff9900', 15);
                    boss.missiles.splice(i, 1);
                    camera.shake(15);
                    hitStopTimer = 0.08;
                }
            });

            if (checkCollision(player, boss)) {
                player.lifespan -= 30 * dtReal;
                if (player.blinkFrames <= 0) {
                    player.blinkFrames = 0.1;
                    camera.shake(5);
                }
            }
        }

        // HUD Update
        lifespanBarEl.style.width = Math.max(0, (player.lifespan / player.maxLifespan) * 100) + '%';
        bossHealthEl.textContent = Math.max(0, Math.floor(boss.health));
        bossHealthEl.style.color = boss.phase === 3 ? '#ff4dff' : (boss.phase === 2 ? '#7a4dff' : '#4d4dff');
    }

    ctx.save();
    camera.apply(ctx);
    
    particles.draw(ctx);
    player.draw(ctx);
    boss.draw(ctx);
    
    ctx.restore();

    camera.drawFlash(ctx);

    // Dash UI
    if (player.dashCooldown > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(20, canvas.height - 40, 150, 10);
        ctx.fillStyle = 'white';
        ctx.fillRect(20, canvas.height - 40, (1 - player.dashCooldown/0.8) * 150, 10);
        ctx.font = '12px Courier New';
        ctx.fillText('DASH READY', 20, canvas.height - 45);
    }

    if (player.lifespan <= 0) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 64px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('MISSION FAILED', canvas.width / 2, canvas.height / 2);
    } else if (boss.health <= 0) {
        ctx.fillStyle = '#ff4dff';
        ctx.font = 'bold 64px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET ELIMINATED', canvas.width / 2, canvas.height / 2);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
