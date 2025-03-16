// Generate cute bubbles for background
function createBubbles() {
    const background = document.getElementById('background');
    const bubbleCount = 20;
    
    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        // Random size between 20 and 100px
        const size = Math.floor(Math.random() * 80) + 20;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        // Random position
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.top = `${Math.random() * 100}%`;
        
        // Random delay for animation
        bubble.style.animationDelay = `${Math.random() * 5}s`;
        
        // Random color
        const hue = Math.floor(Math.random() * 30) + 330; // Pink hues
        bubble.style.background = `hsla(${hue}, 100%, 85%, 0.3)`;
        
        background.appendChild(bubble);
    }
}