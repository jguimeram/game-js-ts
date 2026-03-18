# Learning Game Development & TypeScript with STRIKER

This project serves as a comprehensive primer for modern web-based game development. By studying this codebase, you can master the transition from static web pages to dynamic, high-performance interactive systems.

## 1. Mastering TypeScript in Game Contexts

### Strict Typing & Interfaces
In `src/game/Game.ts`, notice how we use `Record<string, boolean>` for input handling. TypeScript ensures that we don't accidentally try to read undefined properties on our state objects. 
**Lesson:** Use types to define the "shape" of your game state. This prevents runtime errors in complex loops where thousands of operations happen per second.

### Abstract Classes & Inheritance
Look at `src/game/entities/Entity.ts` and its relationship with `Player.ts` and `Boss.ts`.
- **`abstract class Entity`**: Defines the contract (must have `update` and `draw`).
- **Polymorphism**: The `Game` loop calls `update()` on different objects without needing to know their specific type, relying on the base class definition.

---

## 2. Core Game Engine Architecture

### The Game Loop (`src/game/Game.ts`)
The heartbeat of the game is `requestAnimationFrame`. 
- **Delta Time (dt)**: We calculate the time elapsed between frames. This is critical. Without `dt`, the game would run at different speeds on different monitors (e.g., 60Hz vs 144Hz). 
- **Logic vs. Rendering**: The loop separates "Update" (physics/AI) from "Draw" (rendering to canvas).

### Vector Mathematics (`src/engine/Vector.ts`)
Games are built on linear algebra. Our `Vector` class handles:
- **Normalization**: Reducing a vector to a length of 1 to determine direction without affecting speed.
- **Scalar Multiplication**: Applying speed to a direction.
- **Subtraction**: Finding the direction from Point A to Point B (`Vector.sub(target, self)`).

---

## 3. Advanced Game Mechanics

### State Machines
The Boss (`src/game/entities/Boss.ts`) uses an `enum BossState`. This is a **Finite State Machine (FSM)**.
- It transitions between `IDLE`, `TELEGRAPH`, `SURGE`, and `STAGING`.
- **Learning Point**: FSMs are the gold standard for game AI. They prevent "spaghetti code" by ensuring an entity can only be in one logical state at a time.

### Collision Detection
We use **Circle-to-Circle Collision** (`Entity.checkCollision`).
- **Math**: If the distance between two centers is less than the sum of their radii, they are touching. 
- **Optimization**: This is computationally cheaper than "Box-to-Box" or "Pixel-Perfect" collision.

### Particle Systems (`src/engine/ParticleSystem.ts`)
This demonstrates **Object Lifecycle Management**.
- Particles are created, updated, and then "culled" (removed from the array) when their `life <= 0`.
- This teaches you how to manage memory and performance when dealing with hundreds of short-lived objects.

---

## 4. Systems Interconnectivity

### Camera & Screen Shake (`src/engine/Camera.ts`)
The Camera doesn't "move" the world; it transforms the Canvas context (`ctx.translate`). 
- **Juice**: Screen shake is implemented by adding random offsets to the translation matrix.
- **Interpolation**: The zoom uses linear interpolation (`lerp`) logic to smooth transitions between zoom levels.

### UI/HUD Integration
The game uses a hybrid approach: **Canvas for action** and **HTML/CSS for UI**.
- **Performance**: High-frequency updates (health bars, timers) are done via direct DOM manipulation in `updateHUD`.
- **Event Bus**: The `Game` class acts as a mediator, taking data from the engine and pushing it to the DOM.

---

## 5. How to Progress from Here

To truly learn from this project, try the following exercises:
1. **Refactor the Projectiles**: Make a new class `ExplosiveBullet` that inherits from `Bullet` but spawns particles in a circle when it hits something.
2. **Add a Sound Manager**: Create an engine utility that triggers HTML5 Audio based on game events (e.g., `boss.takeDamage()`).
3. **Implement a Wave System**: Modify `Game.ts` to spawn multiple `Minion` waves based on the `gameTime`.

## 6. Strategic Study Guide

To maximize your learning, follow this targeted reading path while cross-referencing our implementation.

### Path A: The Physics & Movement Expert
**Resource:** *The Nature of Code* (Daniel Shiffman)
1.  **Read Chapter 1 (Vectors)**: Compare with our `src/engine/Vector.ts`. Understand why we use `mag()` and `normalize()`.
2.  **Read Chapter 2 (Forces)**: Look at `src/game/entities/Player.ts`. See how we apply `acc` (acceleration) to `vel` (velocity), and how friction is applied as a scalar multiplier.
3.  **Read Chapter 6 (Autonomous Agents)**: Analyze `src/game/entities/HomingMissile.ts`. Notice how the missile "steers" toward the target using vector subtraction and interpolation rather than instantly snapping to the target's position.

### Path B: The Software Architect
**Resource:** *Game Programming Patterns* (Robert Nystrom)
1.  **Read "Game Loop"**: Compare with `src/game/Game.ts`. Note how we handle `dt` (delta time) to ensure consistent speed across different hardware.
2.  **Read "State"**: Examine `src/game/entities/Boss.ts`. See how the `BossState` enum and the `switch(this.state)` block implement a clean, maintainable Finite State Machine.
3.  **Read "Update Method"**: Look at `src/game/entities/Entity.ts`. This is the fundamental pattern where every object in the game world is responsible for updating its own state every frame.

### Path C: The TypeScript Pro
**Resource:** *TypeScript Handbook*
1.  **Read "Classes" (Inheritance & Abstract Classes)**: Study `src/game/entities/Entity.ts` and `src/game/entities/Projectile.ts`. These are "templates" that cannot be instantiated on their own but provide the backbone for every actor in the game.
2.  **Read "Enums"**: See how `BossState` in `src/game/entities/Boss.ts` provides human-readable labels for the boss's logical phases, making the code much easier to debug than using magic numbers or strings.
3.  **Read "Generics"**: While not heavily used yet, try refactoring the `ParticleSystem` to accept a generic type of Particle to see how you could extend the engine's flexibility.

### Recommended Resources Summary
- **Math**: "The Nature of Code" by Daniel Shiffman (Essential for Vectors/Physics).
- **Design**: "Game Programming Patterns" by Robert Nystrom (Essential for FSMs and Component patterns).
- **TypeScript**: The official handbook for Advanced Types (Generics, Mapped Types).
