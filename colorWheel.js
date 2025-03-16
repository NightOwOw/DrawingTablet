// Create color wheel
function createColorWheel() {
    const canvas = document.getElementById('color-wheel');
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 5;
    
    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
        const startAngle = (angle - 1) * Math.PI / 180;
        const endAngle = (angle + 1) * Math.PI / 180;
        
        for (let sat = 0; sat < radius; sat++) {
            const satPercent = sat / radius;
            ctx.beginPath();
            ctx.arc(centerX, centerY, sat, startAngle, endAngle);
            ctx.strokeStyle = `hsl(${angle}, ${satPercent * 100}%, 50%)`;
            ctx.stroke();
        }
    }
    
    // Draw lightness gradient in center
    const innerRadius = radius * 0.3;
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, innerRadius
    );
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Handle color selection
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get pixel color at click position
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        const color = `#${pixelData[0].toString(16).padStart(2, '0')}${pixelData[1].toString(16).padStart(2, '0')}${pixelData[2].toString(16).padStart(2, '0')}`;
        
        // Update current color
        document.getElementById('current-color').style.backgroundColor = color;
        document.getElementById('color-value').value = color;
    });
    
    // Allow manual color input
    document.getElementById('color-value').addEventListener('change', (e) => {
        const color = e.target.value;
        document.getElementById('current-color').style.backgroundColor = color;
    });
}