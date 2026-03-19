# GEMINI.md

## Project Overview
**STRIKER v1.0** is a high-performance, TypeScript-based 2D action game featuring boss battles with multiple operation modes (Striker, Healer, and Debug). The project demonstrates modern web game development techniques using **HTML5 Canvas** for high-frequency rendering and **DOM** for the User Interface (HUD/Menus). It is built with **Vite** for optimized development and bundling, and **Vitest** for unit and integration testing.

### Main Technologies
- **Language:** TypeScript (Strict mode)
- **Rendering:** HTML5 Canvas API (2D Context)
- **UI/HUD:** HTML/CSS with direct DOM manipulation for real-time updates.
- **Build Tool:** Vite
- **Testing:** Vitest (jsdom environment)
- **Architecture:** Object-Oriented with an abstract base `Entity` class, modular engine components (`Vector`, `Camera`, `ParticleSystem`), and a centralized `Game` controller.

---

## Building and Running
The project follows standard Node.js/Vite workflows.

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies. |
| `npm run dev` | Start the local development server (Vite) at `http://localhost:5173`. |
| `npm run build` | Compile TypeScript and build production assets into the `dist/` folder. |
| `npm run preview`| Preview the production build locally. |
| `npm test` | Execute unit tests with Vitest (uses `jsdom`). |

---

## Development Conventions

### Coding Style
- **Strict Typing:** Always use strict TypeScript types; avoid `any` unless absolutely necessary for external event payloads.
- **Object-Oriented Design:** Leverage abstract classes (`Entity`, `Projectile`) and polymorphism for game world actors.
- **Entity Compatibility:** When swapping entities (e.g., using `HealerPlayer` as the main player), ensure they implement a base set of properties (`bullets`, `magicSpells`, `activeSkill`, `dashCooldown`, `dashIFrame`) to avoid runtime crashes in shared systems like `checkCollisions` and `updateHUD`. Always prefer safer property access or explicit property checks in the central loop.
- **Logic vs. Rendering:** Keep update logic (physics, AI) separated from drawing logic (`draw(ctx)` methods).
- **Delta Time (`dt`):** All movement and timers MUST be scaled by `dt` to ensure frame-independent gameplay (consistent across 60Hz and 144Hz displays).
- **FSM (Finite State Machines):** Use enums and switch statements for complex entity behaviors (e.g., `BossState`).

### Testing Practices
- **Core Engine Testing:** Mathematical utilities like `Vector` should have comprehensive unit tests (`src/engine/Vector.test.ts`).
- **Game Logic Testing:** Use `jsdom` to test the `Game` class and entity interactions within the Vitest environment.
- **Naming:** Test files should follow the `*.test.ts` convention next to the source file.

---

## Architecture & Technical Concepts

### 1. The Game Loop
Implemented in `src/game/Game.ts` using `requestAnimationFrame`. It manages the lifecycle of all entities, handling input, physics updates, collision detection, and finally rendering to the canvas.

### 2. Engine Utilities
- **`Vector.ts`:** Handles 2D linear algebra (normalization, distance, scaling, interpolation).
- **`Camera.ts`:** Manages viewport transformation, zoom levels, and "Juice" (screen shake).
- **`ParticleSystem.ts`:** Lightweight lifecycle management for visual effects (explosions, sparks).
- **`DamageNumber.ts`:** Floating UI indicators within the game world.

### 3. Entity System
Every object in the world inherits from `Entity`, requiring:
- `update(dt: number)`: Updates state/physics.
- `draw(ctx: CanvasRenderingContext2D)`: Renders the entity.
- `checkCollision(other: Entity)`: Basic circle-to-circle collision detection.

---

## Key Files & Directories
- `src/main.ts`: Entry point; initializes the menu and `Game` instance.
- `src/game/Game.ts`: The central controller managing state, HUD, and the main loop.
- `src/game/entities/`: Contains all game world actors (Player, Boss, Minion, etc.).
- `src/engine/`: Core reusable utilities for game development.
- `docs/`: Documentation on functions, development guides (`HOW-TO.md`), and architecture diagrams.
- `vitest.config.ts`: Configuration for the testing environment.
