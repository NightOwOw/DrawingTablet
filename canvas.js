// Initialize canvas and drawing context
function initCanvas() {
    const canvas = document.getElementById('drawing-canvas');
    const container = document.querySelector('.canvas-container');
    
    // Set canvas size to 1920x1080
    canvas.width = 1920;
    canvas.height = 1080;
    
    // Scale to fit container while maintaining aspect ratio
    function resizeCanvas() {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const containerRatio = containerWidth / containerHeight;
        const canvasRatio = canvas.width / canvas.height;
        
        if (containerRatio > canvasRatio) {
            // Container is wider than canvas
            const scale = containerHeight / canvas.height;
            canvas.style.width = `${canvas.width * scale}px`;
            canvas.style.height = `${containerHeight}px`;
        } else {
            // Container is taller than canvas
            const scale = containerWidth / canvas.width;
            canvas.style.width = `${containerWidth}px`;
            canvas.style.height = `${canvas.height * scale}px`;
        }
    }
    
    // Initial resize and add listener for window resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return canvas;
}