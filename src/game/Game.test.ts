import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';

describe('Game Initialization and Logic', () => {
  let game: Game;

  beforeEach(() => {
    // Mock the DOM
    document.body.innerHTML = `
      <div id="hud">
        <div id="lifespan-container"><div id="lifespan-bar"></div></div>
        <div id="shooter-hud" style="display: none;">
            <div id="shooter-lifespan-bar"></div>
        </div>
        <div id="boss-health">1000</div>
        <div id="game-timer">00:00</div>
      </div>
      <div id="skills-hud">
        <div id="skill-1"><span class="key">1</span> STRIKE <div class="cooldown-overlay"></div></div>
        <div id="skill-2"><span class="key">2</span> MAGIC <div class="cooldown-overlay"></div><span class="cooldown-timer"></span></div>
        <div id="skill-3"><span class="key">3</span> REPAIR <div class="cooldown-overlay"></div><span class="cooldown-timer"></span></div>
      </div>
      <div id="debug-tooltip"></div>
      <div id="game-over-overlay" style="display: none;">
        <div id="game-over-title"></div>
        <div id="stat-time"></div>
        <div id="stat-lifespan"></div>
        <div id="stat-damage"></div>
        <button id="btn-reset"></button>
      </div>
      <canvas id="gameCanvas"></canvas>
    `;

    // Mock canvas context
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    canvas.getContext = vi.fn().mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      closePath: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
    });

    game = new Game(true);
  });

  // Functional Tests
  it('should initialize player and boss with correct positions', () => {
    const player = (game as any).player;
    const boss = (game as any).boss;

    expect(player).toBeDefined();
    expect(boss).toBeDefined();

    // Initial positions depend on canvas size
    expect(player.pos.y).toBeGreaterThan(0);
    expect(boss.pos.y).toBeLessThan(400); 
  });

  it('should update entities during the game loop', () => {
    const player = (game as any).player;
    const initialPlayerPos = player.pos.copy();

    // Let's mock a key press
    (game as any).keys['ArrowUp'] = true;
    // @ts-ignore
    game.update(0.1, 0.1);

    expect(player.pos.y).toBeLessThan(initialPlayerPos.y);
  });

  it('should decrease boss health on collision', () => {
    const player = (game as any).player;
    const boss = (game as any).boss;
    const initialBossHealth = boss.health;

    // Move player's bullet to hit the boss
    player.bullets.push({
        pos: boss.pos.copy(),
        radius: 10,
        checkCollision: () => true,
        update: vi.fn()
    } as any);

    // @ts-ignore
    game.checkCollisions(0.016);
    expect(boss.health).toBeLessThan(initialBossHealth);
  });

  // Non-Functional Tests
  it('should handle window resize by updating canvas dimensions', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    
    global.innerWidth = 1920;
    global.innerHeight = 1080;
    window.dispatchEvent(new Event('resize'));

    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
  });

  it('should maintain a stable lastTime to avoid huge dt jumps', () => {
    game.start();
    const firstTime = (game as any).lastTime;
    
    // Simulate loop after 100ms
    // @ts-ignore
    game.loop(performance.now() + 100);
    const secondTime = (game as any).lastTime;

    expect(secondTime - firstTime).toBeGreaterThan(0);
    expect(secondTime - firstTime).toBeLessThan(5000); // Relaxed for tests
  });

  it('should initialize and update correctly in HEALER mode', () => {
    // @ts-ignore
    const gameHealer = new Game(false, 'HEALER');
    expect((gameHealer as any).healer).toBeDefined();
    expect((gameHealer as any).shooterAI).toBeDefined();
    
    // @ts-ignore
    gameHealer.shooterAI.updateAI(0.1, gameHealer.boss, gameHealer.minions, gameHealer.particles, gameHealer.camera, 1920, 1080);
    
    // @ts-ignore
    gameHealer.draw();
  });
});
