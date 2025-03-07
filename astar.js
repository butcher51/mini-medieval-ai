// A* pathfinding implementation
class Node {
    constructor(x, y, g = 0, h = 0) {
        this.x = x;
        this.y = y;
        this.g = g; // Cost from start to this node
        this.h = h; // Heuristic (estimated cost from this node to end)
        this.f = g + h; // Total cost
        this.parent = null;
    }
}

export function findPath(startX, startY, endX, endY, isWalkable) {
    const openSet = new Set();
    const closedSet = new Set();
    const startNode = new Node(startX, startY);
    const endNode = new Node(endX, endY);
    
    openSet.add(startNode);
    
    while (openSet.size > 0) {
        // Find node with lowest f cost
        let current = Array.from(openSet).reduce((min, node) => 
            node.f < min.f ? node : min
        );
        
        if (current.x === endNode.x && current.y === endNode.y) {
            // Path found, reconstruct and return it
            return reconstructPath(current);
        }
        
        openSet.delete(current);
        closedSet.add(current);
        
        // Check all adjacent squares
        for (let dx of [-1, 0, 1]) {
            for (let dy of [-1, 0, 1]) {
                if (dx === 0 && dy === 0) continue; // Skip current square
                if (Math.abs(dx) === 1 && Math.abs(dy) === 1) continue; // Skip diagonals
                
                const newX = current.x + dx;
                const newY = current.y + dy;
                
                // Skip if not walkable
                if (!isWalkable(newX, newY)) continue;
                
                const neighbor = new Node(newX, newY);
                
                // Skip if in closed set
                if (Array.from(closedSet).some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    continue;
                }
                
                // Calculate g score
                const tentativeG = current.g + 1;
                
                // Check if this path is better than any previous one
                const existingNeighbor = Array.from(openSet).find(node => 
                    node.x === neighbor.x && node.y === neighbor.y
                );
                
                if (!existingNeighbor) {
                    neighbor.g = tentativeG;
                    neighbor.h = manhattanDistance(neighbor, endNode);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = current;
                    openSet.add(neighbor);
                } else if (tentativeG < existingNeighbor.g) {
                    existingNeighbor.g = tentativeG;
                    existingNeighbor.f = existingNeighbor.g + existingNeighbor.h;
                    existingNeighbor.parent = current;
                }
            }
        }
    }
    
    // No path found
    return null;
}

function manhattanDistance(nodeA, nodeB) {
    return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
}

function reconstructPath(endNode) {
    const path = [];
    let current = endNode;
    
    while (current) {
        path.unshift({ x: current.x, y: current.y });
        current = current.parent;
    }
    
    return path;
}

// Helper function to check if a path is within move range
export function isPathInRange(path, movePoints) {
    return path && path.length - 1 <= movePoints; // -1 because path includes starting position
} 