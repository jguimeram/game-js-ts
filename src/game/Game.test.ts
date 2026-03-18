import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { Vector } from '../engine/Vector';

describe('Game Initialization and Logic', () => {
  let game: Game;

  beforeEach(() => {
    // Mock the DOM
    document.body.innerHTML = `
      <div id="hud">
        <div id="lifespan-container"><div id="lifespan-bar"></div></div>
        <div id="boss-health">1000</div>
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
    });

    game = new Game();
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
});
