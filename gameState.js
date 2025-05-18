export function createGameState() {
    return {
        cameraX: 0,
        cameraY: 0,
        mouseX: 0,
        mouseY: 0,
        hoveredTile: { x: -1, y: -1 },
        currentPath: null,
        currentTurn: "player", // 'player' or 'enemies'        
        isMoving: false, // Track if any character is currently moving
        activeMovementPath: null, // Store the path being followed during movement
        skipButton: null,
        turnHistory: [] // Array to store turn history
    };
}