# Codebase Documentation: Gemini CLI Game

This document provides an overview of the classes, functions, and architecture of the application.

## Table of Contents
1. [Core / Entry Point](#core--entry-point)
2. [Engine Utilities](#engine-utilities)
   - [Vector](#vector)
   - [Camera](#camera)
   - [ParticleSystem](#particlesystem)
   - [DamageNumber](#damagenumber)
3. [Game Logic](#game-logic)
   - [Game](#game)
4. [Entities](#entities)
   - [Entity (Base)](#entity-base)
   - [Player](#player)
   - [Boss](#boss)
   - [Minion](#minion)
   - [DamageArea](#damagearea)
   - [Projectile System](#projectile-system)

---

## Core / Entry Point

### `src/main.ts`
The entry point of the application. It handles the initial menu interaction and starts the game instance.
- **`startGame(debug: boolean)`**: Initializes a new `Game` instance, hides the menu, and calls `game.start()`.
- **`init()`**: Sets up event listeners for the "Start Game" and "Debug Mode" buttons.

---

## Engine Utilities

### `Vector` (`src/engine/Vector.ts`)
A 2D vector class for handling positions, velocities, and physics calculations.
- **`add(v: Vector)`**: Adds another vector to this instance.
- **`sub(v: Vector)`**: Subtracts another vector from this instance.
- **`mult(n: number)`**: Multiplies the vector by a scalar.
- **`mag()`**: Returns the magnitude (length) of the vector.
- **`normalize()`**: Scales the vector to a length of 1.
- **`copy()`**: Returns a new Vector instance with the same coordinates.
- **`static sub(v1, v2)`**: Returns a new vector representing the difference between two vectors.
- **`static dist(v1, v2)`**: Returns the Euclidean distance between two vectors.

### `Camera` (`src/engine/Camera.ts`)
Manages screen-shaking, zooming, and coordinate transformations.
- **`shake(intensity: number)`**: Adds a screen-shake effect.
- **`update(dt: number)`**: Decays the shake intensity and smooths the zoom level over time.
- **`apply(ctx, width, height)`**: Applies transformations (zoom, shake, centering) to the Canvas context.
- **`screenToWorld(mx, my, width, height)`**: Converts screen coordinates (like mouse clicks) to world coordinates.
- **`drawFlash(ctx, width, height)`**: Draws a full-screen white flash overlay.

### `ParticleSystem` (`src/engine/ParticleSystem.ts`)
A simple particle system for visual effects.
- **`Particle` class**: Individual particle with life, velocity, and color.
- **`emit(pos, color, count, speedRange)`**: Spawns a cluster of particles at a position.
- **`update(dt)`**: Updates all active particles and removes dead ones.
- **`draw(ctx)`**: Renders all particles with alpha transparency based on their remaining life.

### `DamageNumber` (`src/engine/DamageNumber.ts`)
Handles floating text numbers that appear when damage is dealt.
- **`update(dt)`**: Moves the text upward with slight gravity and fades it out.
- **`draw(ctx)`**: Renders the text with a black outline for readability.

---

## Game Logic

### `Game` (`src/game/Game.ts`)
The central controller that orchestrates the game loop, input, and collision detection.
- **`start()`**: Begins the `requestAnimationFrame` loop and initializes the `gameTime`.
- **`loop(timestamp)`**: The main game loop. Calculates delta time (`dt`) and calls `update` and `draw`.
- **`update(dt, dtReal)`**: Handles game state logic:
  - Updates player, boss, and minions.
  - Spawns minions when boss enters the `STAGING` state.
  - Spawns environmental `DamageArea` hazards every 3 seconds when boss health is < 50%.
  - Manages camera zoom based on boss state.
  - Calls collision detection.
  - Triggers the Game Over overlay on player death or boss defeat.
- **`checkCollisions(dtReal)`**: Handles all entity interactions:
  - Player bullets hitting Boss/Minions.
  - Boss/Minion projectiles and `DamageArea` hazards hitting the Player.
  - Direct contact between Player and Boss.
- **`draw()`**: Clears the canvas and renders all game components.
- **`resetToMenu()`**: Returns the player to the main menu overlay.

---

## Entities

### `Entity` (Base) (`src/game/entities/Entity.ts`)
An abstract base class for all game objects.
- **`checkCollision(other: Entity)`**: Basic circle-to-circle collision detection.
- **`drawHitbox(ctx)`**: Utility for debugging collision radiuses.

### `Player` (`src/game/entities/Player.ts`)
The player-controlled entity.
- **`dash(keys, camera)`**: Performs a high-speed dash in the movement direction with invincibility frames.
- **`update(...)`**: Handles movement, boundaries, and shooting.
- **`draw(ctx)`**: Renders the player character with squash-and-stretch scaling.

### `Boss` (`src/game/entities/Boss.ts`)
The main antagonist with complex behavior states.
- **`update(...)`**: Manages movement, phase transitions, and attack states (`IDLE`, `TELEGRAPH`, `SURGE`, `STAGING`).
- **`decideNextAttack()`**: Selects an attack and starts a `TELEGRAPH` phase.
- **`draw(ctx)`**: Renders the boss, its telegraphing rings, and a **Cast Bar** during attacks.
- **`checkHealthThresholds()`**: Triggers `STAGING` phases at 75%, 50%, and 25% health.

### `Minion` (`src/game/entities/Minion.ts`)
Smaller enemies spawned by the boss.
- **`draw(ctx)`**: Renders the minion along with a **Health Bar** above it.

### `DamageArea` (`src/game/entities/DamageArea.ts`)
Environmental hazards that spawn during the boss's later phases.
- **`telegraphDuration`**: Time before the area becomes active (1s).
- **`activeDuration`**: Time the area remains dangerous (5s).
- **`draw(ctx)`**: Renders a pulsing telegraph ring followed by a dangerous damage zone.

### Projectile System
- **`Projectile` (`src/game/entities/Projectile.ts`)**: Base class for all moving projectiles.
- **`Bullet` (`src/game/entities/Bullet.ts`)**: Standard linear projectile.
- **`HomingMissile` (`src/game/entities/HomingMissile.ts`)**: A projectile that steers toward its target and leaves a particle trail.
