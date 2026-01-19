import { describe, it, expect } from "vitest";
import { findPath } from "./astar.js";

describe("A* Pathfinding", () => {
    it("should find a straight path with no obstacles", () => {
        // Simple walkable function - all tiles are walkable in a 10x10 grid
        const isWalkable = (x, y) => x >= 0 && x < 10 && y >= 0 && y < 10;

        // Find path from (0, 0) to (3, 0) - should be a straight horizontal line
        const path = findPath(0, 0, 3, 0, isWalkable);

        // Should find a path
        expect(path).not.toBeNull();

        // Path should have 4 points: start (0,0), (1,0), (2,0), end (3,0)
        expect(path).toHaveLength(4);

        // Verify start and end points
        expect(path[0]).toEqual({ x: 0, y: 0 });
        expect(path[3]).toEqual({ x: 3, y: 0 });
    });
});
