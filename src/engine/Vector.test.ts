import { describe, it, expect } from 'vitest';
import { Vector } from './Vector';

describe('Vector Class', () => {
  it('should correctly add two vectors', () => {
    const v1 = new Vector(10, 20);
    const v2 = new Vector(5, -5);
    v1.add(v2);
    expect(v1.x).toBe(15);
    expect(v1.y).toBe(15);
  });

  it('should correctly normalize a vector', () => {
    const v = new Vector(10, 0);
    v.normalize();
    expect(v.x).toBe(1);
    expect(v.y).toBe(0);

    const v2 = new Vector(3, 4); // mag 5
    v2.normalize();
    expect(v2.x).toBeCloseTo(0.6);
    expect(v2.y).toBeCloseTo(0.8);
  });

  it('should handle zero-vector normalization gracefully (non-functional)', () => {
    const v = new Vector(0, 0);
    expect(() => v.normalize()).not.toThrow();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('should correctly calculate distance between two vectors', () => {
    const v1 = new Vector(0, 0);
    const v2 = new Vector(3, 4);
    expect(Vector.dist(v1, v2)).toBe(5);
  });
});
