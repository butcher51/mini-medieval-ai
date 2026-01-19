/**
 * Prevents browser zoom from wheel, keyboard, and touch gestures.
 * Call this function once to set up all zoom prevention event listeners.
 */
export function initZoomPrevention() {
    // Prevent browser zoom from Ctrl+scroll
    window.addEventListener(
        "wheel",
        (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        },
        { passive: false },
    );

    // Prevent browser zoom from keyboard shortcuts (Ctrl/Cmd + +/-/0)
    window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) {
            e.preventDefault();
        }
    });

    // Prevent pinch-to-zoom on touch devices
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("gesturechange", (e) => e.preventDefault());
    document.addEventListener("gestureend", (e) => e.preventDefault());
}
