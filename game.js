const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lifespanBarEl = document.getElementById('lifespan-bar');
const bossHealthEl = document.getElementById('boss-health');

// Resize canvas to fill the window
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Input management
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

class Bullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.closePath();
    }
}

class HomingMissile {
    constructor(x, y, target) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.speed = 3;
        this.radius = 8;
        this.lifetime = 240; // 4 seconds at 60fps
    }

    update() {
        if (this.lifetime > 0) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
            this.lifetime--;
        } else {
            // After 4 seconds, just travel in current direction (simplified)
            // or just disappear. Let's make it disappear when it expires.
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff9900'; // Orange for missile
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.closePath();
    }
}

class Player {
    constructor() {
        this.radius = 15;
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.color = 'red';
        this.speed = 5;
        this.lifespan = 100;
        this.maxLifespan = 100;
        this.bullets = [];
        this.shootCooldown = 0;
        this.blinkFrames = 0;
    }

    update() {
        if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;
        if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;

        // Boundary checks
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Shooting
        if (keys['Space'] && this.shootCooldown <= 0) {
            this.bullets.push(new Bullet(this.x, this.y - this.radius, 0, -10));
            this.shootCooldown = 10; // Cooldown frames
        }
        if (this.shootCooldown > 0) this.shootCooldown--;

        if (this.blinkFrames > 0) this.blinkFrames--;

        this.bullets.forEach((bullet, index) => {
            bullet.update();
            if (bullet.y < 0) this.bullets.splice(index, 1);
        });
    }

    draw() {
        // Blink effect
        if (this.blinkFrames > 0 && Math.floor(this.blinkFrames / 5) % 2 === 0) {
            return; // Skip drawing for blinking effect
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        this.bullets.forEach(bullet => bullet.draw());
    }
}

class Boss {
    constructor(player) {
        this.player = player;
        this.radius = 90;
        this.x = canvas.width / 2;
        this.y = 150;
        this.vx = 4;
        this.vy = 2;
        this.health = 1000;
        this.color = '#4d4dff';
        this.blinkFrames = 0;
        this.attackTimer = 0;
        this.bullets = [];
        this.missiles = [];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bouncing logic
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) this.vx *= -1;
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height / 2) this.vy *= -1;

        if (this.blinkFrames > 0) this.blinkFrames--;

        // Attack pattern
        this.attackTimer++;
        if (this.attackTimer === 150) {
            // New attack: Homing missile in between area attacks
            this.shootMissile();
        } else if (this.attackTimer >= 300) {
            // Original attack: Area damage
            this.shootAreaAttack();
            this.attackTimer = 0;
        }

        // Update boss bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            if (bullet.x < -bullet.radius || bullet.x > canvas.width + bullet.radius ||
                bullet.y < -bullet.radius || bullet.y > canvas.height + bullet.radius) {
                this.bullets.splice(i, 1);
            }
        }

        // Update missiles
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            missile.update();
            if (missile.lifetime <= 0) {
                this.missiles.splice(i, 1);
            }
        }
    }

    shootAreaAttack() {
        const numBalls = 10;
        const speed = 5;
        for (let i = 0; i < numBalls; i++) {
            const angle = (i / numBalls) * Math.PI * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.bullets.push(new Bullet(this.x, this.y, vx, vy));
        }
    }

    shootMissile() {
        this.missiles.push(new HomingMissile(this.x, this.y, this.player));
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.blinkFrames > 0 ? 'white' : this.color;
        ctx.fill();
        ctx.closePath();

        // Draw boss bullets
        this.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4d4d';
            ctx.fill();
            ctx.closePath();
        });

        // Draw missiles
        this.missiles.forEach(missile => missile.draw());
    }
}

const player = new Player();
const boss = new Boss(player);

function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.radius + obj2.radius;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.lifespan > 0 && boss.health > 0) {
        player.update();
        boss.update();

        // Check bullet hits on boss
        player.bullets.forEach((bullet, index) => {
            if (checkCollision(bullet, boss)) {
                boss.health -= 10;
                boss.blinkFrames = 5;
                player.bullets.splice(index, 1);
            }
        });

        // Check boss bullets hit player
        boss.bullets.forEach((bullet, index) => {
            if (checkCollision(bullet, player)) {
                player.lifespan -= 10;
                player.blinkFrames = 30; // Blink for 30 frames when hit
                boss.bullets.splice(index, 1);
            }
        });

        // Check boss missiles hit player
        boss.missiles.forEach((missile, index) => {
            if (checkCollision(missile, player)) {
                player.lifespan -= 20; // Missiles do more damage
                player.blinkFrames = 30;
                boss.missiles.splice(index, 1);
            }
        });

        // Check boss collision with player
        if (checkCollision(player, boss)) {
            player.lifespan -= 1;
            if (player.blinkFrames <= 0) player.blinkFrames = 10;
        }

        // Update HUD
        lifespanBarEl.style.width = Math.max(0, (player.lifespan / player.maxLifespan) * 100) + '%';
        bossHealthEl.textContent = Math.max(0, Math.floor(boss.health));
    }

    player.draw();
    boss.draw();

    if (player.lifespan <= 0) {
        ctx.fillStyle = 'white';
        ctx.font = '48px Courier New';
        ctx.fillText('GAME OVER', canvas.width / 2 - 120, canvas.height / 2);
    } else if (boss.health <= 0) {
        ctx.fillStyle = 'white';
        ctx.font = '48px Courier New';
        ctx.fillText('VICTORY!', canvas.width / 2 - 100, canvas.height / 2);
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
