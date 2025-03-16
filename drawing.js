// Drawing functionality
function initDrawing(canvas) {
    const ctx = canvas.getContext('2d');
    const layers = [];
    let currentLayer = null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let isEraser = false;
    let history = [];
    let historyIndex = -1;
    let recentColors = [];
    let brushShape = 'round'; // 'round' or 'square'
    
    // Brush properties
    const brush = {
        size: 10,
        opacity: 1,
        color: '#000000'
    };
    
    // Initialize with a default layer
    function addLayer() {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = canvas.width;
        layerCanvas.height = canvas.height;
        
        const layer = {
            canvas: layerCanvas,
            context: layerCanvas.getContext('2d'),
            name: `Layer ${layers.length + 1}`,
            visible: true
        };
        
        layers.push(layer);
        updateLayerList();
        setCurrentLayer(layers.length - 1);
        
        return layer;
    }
    
    // Create first layer with white background
    function createBackgroundLayer() {
        const layer = addLayer();
        layer.name = "Background";
        layer.context.fillStyle = "white";
        layer.context.fillRect(0, 0, canvas.width, canvas.height);
        redrawCanvas();
        saveState();
    }
    
    // Draw to current layer
    function draw(e) {
        if (!isDrawing || !currentLayer || currentTool === 'fill') return;
        
        const rect = canvas.getBoundingClientRect();
        // Calculate position with scaling to match 1920x1080
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const ctx = currentLayer.context;
        ctx.globalAlpha = brush.opacity;
        
        if (isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brush.color;
        }
        
        ctx.lineWidth = brush.size;
        
        // Set brush shape
        if (brushShape === 'round') {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        } else {
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
        }
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
        
        // Redraw entire canvas
        redrawCanvas();
    }
    
    // Fill functionality
    function fillArea(x, y) {
        if (!currentLayer) return;
        
        const ctx = currentLayer.context;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Get color at clicked position
        const targetPos = (Math.floor(y) * width + Math.floor(x)) * 4;
        const targetR = data[targetPos];
        const targetG = data[targetPos + 1];
        const targetB = data[targetPos + 2];
        const targetA = data[targetPos + 3];
        
        // Parse fill color
        const fillColor = brush.color;
        const r = parseInt(fillColor.slice(1, 3), 16);
        const g = parseInt(fillColor.slice(3, 5), 16);
        const b = parseInt(fillColor.slice(5, 7), 16);
        
        // Check if target color is the same as fill color
        if (r === targetR && g === targetG && b === targetB) {
            return;
        }
        
        // Flood fill algorithm
        const stack = [[Math.floor(x), Math.floor(y)]];
        const visited = new Set();
        
        while (stack.length > 0) {
            const [px, py] = stack.pop();
            const pos = (py * width + px) * 4;
            
            // Check if we're off the canvas or already visited
            if (px < 0 || px >= width || py < 0 || py >= height || visited.has(`${px},${py}`)) {
                continue;
            }
            
            // Check if the color matches the target
            if (Math.abs(data[pos] - targetR) < 5 && 
                Math.abs(data[pos + 1] - targetG) < 5 && 
                Math.abs(data[pos + 2] - targetB) < 5 && 
                Math.abs(data[pos + 3] - targetA) < 5) {
                
                // Fill this pixel
                data[pos] = r;
                data[pos + 1] = g;
                data[pos + 2] = b;
                data[pos + 3] = 255;
                
                visited.add(`${px},${py}`);
                
                // Check neighbors
                stack.push([px + 1, py]);
                stack.push([px - 1, py]);
                stack.push([px, py + 1]);
                stack.push([px, py - 1]);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        redrawCanvas();
        saveState();
        
        // Add to recent colors
        addRecentColor(brush.color);
    }
    
    // Color picker functionality
    function pickColor(x, y) {
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        const color = `#${pixelData[0].toString(16).padStart(2, '0')}${pixelData[1].toString(16).padStart(2, '0')}${pixelData[2].toString(16).padStart(2, '0')}`;
        
        brush.color = color;
        document.getElementById('current-color').style.backgroundColor = color;
        document.getElementById('color-value').value = color;
        
        // Add to recent colors
        addRecentColor(color);
    }
    
    // Add color to recent colors
    function addRecentColor(color) {
        // Check if color already exists in recent colors
        const index = recentColors.indexOf(color);
        if (index !== -1) {
            // Remove from current position
            recentColors.splice(index, 1);
        }
        
        // Add to beginning of array
        recentColors.unshift(color);
        
        // Limit to 10 recent colors
        if (recentColors.length > 10) {
            recentColors.pop();
        }
        
        updateRecentColors();
    }
    
    // Update recent colors UI
    function updateRecentColors() {
        const container = document.getElementById('recent-colors');
        if (!container) return;
        
        container.innerHTML = '';
        
        recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            
            swatch.addEventListener('click', () => {
                brush.color = color;
                document.getElementById('current-color').style.backgroundColor = color;
                document.getElementById('color-value').value = color;
            });
            
            container.appendChild(swatch);
        });
    }
    
    // Save state for undo/redo
    function saveState() {
        // Remove any states after the current index if we've gone back in history
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        
        const state = [];
        layers.forEach(layer => {
            const canvas = document.createElement('canvas');
            canvas.width = layer.canvas.width;
            canvas.height = layer.canvas.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(layer.canvas, 0, 0);
            
            state.push({
                canvas,
                name: layer.name,
                visible: layer.visible
            });
        });
        
        history.push(state);
        historyIndex = history.length - 1;
        
        // Limit history size to prevent memory issues
        if (history.length > 50) {
            history.shift();
            historyIndex--;
        }
    }
    
    // Undo function
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            loadState(historyIndex);
        }
    }
    
    // Redo function
    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            loadState(historyIndex);
        }
    }
    
    // Load state from history
    function loadState(index) {
        const state = history[index];
        if (!state) return;
        
        // Clear layers
        layers.length = 0;
        
        // Restore layers from state
        state.forEach(savedLayer => {
            const newLayer = {
                canvas: document.createElement('canvas'),
                context: null,
                name: savedLayer.name,
                visible: savedLayer.visible
            };
            
            newLayer.canvas.width = canvas.width;
            newLayer.canvas.height = canvas.height;
            newLayer.context = newLayer.canvas.getContext('2d');
            newLayer.context.drawImage(savedLayer.canvas, 0, 0);
            
            layers.push(newLayer);
        });
        
        // Set current layer to the top one
        if (layers.length > 0) {
            currentLayer = layers[layers.length - 1];
        }
        updateLayerList();
        redrawCanvas();
    }
    
    // Keep track of current tool
    let currentTool = 'brush'; // 'brush', 'eraser', 'fill', 'picker'
    
    // Start drawing
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (currentTool === 'fill') {
            fillArea(x, y);
        } else if (currentTool === 'picker') {
            pickColor(x, y);
        } else {
            isDrawing = true;
            lastX = x;
            lastY = y;
            
            // For single dot drawing
            if (currentTool === 'brush' || currentTool === 'eraser') {
                const ctx = currentLayer.context;
                ctx.globalAlpha = brush.opacity;
                
                if (isEraser) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.fillStyle = 'rgba(0,0,0,1)';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = brush.color;
                }
                
                ctx.beginPath();
                if (brushShape === 'round') {
                    ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
                } else {
                    ctx.rect(x - brush.size / 2, y - brush.size / 2, brush.size, brush.size);
                }
                ctx.fill();
                redrawCanvas();
            }
        }
    });
    
    // Continue drawing
    canvas.addEventListener('mousemove', draw);
    
    // Stop drawing
    canvas.addEventListener('mouseup', () => {
        if (isDrawing) {
            isDrawing = false;
            saveState();
            
            // Add to recent colors if using brush
            if (currentTool === 'brush' && !isEraser) {
                addRecentColor(brush.color);
            }
        }
    });
    
    canvas.addEventListener('mouseout', () => {
        if (isDrawing) {
            isDrawing = false;
            saveState();
        }
    });
    
    // Update the main canvas with all visible layers
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw checkerboard pattern for transparency
        drawTransparencyGrid();
        
        // Draw all visible layers
        layers.forEach(layer => {
            if (layer.visible) {
                ctx.drawImage(layer.canvas, 0, 0);
            }
        });
        
        // Update layer thumbnails
        updateLayerThumbnails();
    }
    
    // Draw transparency grid
    function drawTransparencyGrid() {
        const size = 10; // Size of each grid square
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#eeeeee';
        for (let x = 0; x < canvas.width; x += size * 2) {
            for (let y = 0; y < canvas.height; y += size * 2) {
                ctx.fillRect(x, y, size, size);
                ctx.fillRect(x + size, y + size, size, size);
            }
        }
    }
    
    // Update layer thumbnails
    function updateLayerThumbnails() {
        const thumbnails = document.querySelectorAll('.layer-thumbnail');
        thumbnails.forEach((thumbnail, index) => {
            if (index < layers.length) {
                const layer = layers[index];
                const thumbCtx = thumbnail.getContext('2d');
                
                // Clear thumbnail
                thumbCtx.clearRect(0, 0, thumbnail.width, thumbnail.height);
                
                // Draw checkerboard for transparency
                const size = 3; // Size of each grid square
                thumbCtx.fillStyle = '#ffffff';
                thumbCtx.fillRect(0, 0, thumbnail.width, thumbnail.height);
                
                thumbCtx.fillStyle = '#eeeeee';
                for (let x = 0; x < thumbnail.width; x += size * 2) {
                    for (let y = 0; y < thumbnail.height; y += size * 2) {
                        thumbCtx.fillRect(x, y, size, size);
                        thumbCtx.fillRect(x + size, y + size, size, size);
                    }
                }
                
                // Draw scaled down layer
                if (layer.visible) {
                    thumbCtx.drawImage(
                        layer.canvas, 
                        0, 0, layer.canvas.width, layer.canvas.height,
                        0, 0, thumbnail.width, thumbnail.height
                    );
                }
            }
        });
    }
    
    // Update layer list in UI
    function updateLayerList() {
        const container = document.getElementById('layers-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Display layers in reverse order (top layer at the top)
        [...layers].reverse().forEach((layer, reverseIndex) => {
            const index = layers.length - 1 - reverseIndex;
            const layerElement = document.createElement('div');
            layerElement.className = `layer ${currentLayer === layer ? 'active' : ''}`;
            layerElement.dataset.index = index;
            
            // Create thumbnail
            const thumbnail = document.createElement('canvas');
            thumbnail.className = 'layer-thumbnail';
            thumbnail.width = 30;
            thumbnail.height = 30;
            
            const name = document.createElement('div');
            name.className = 'layer-name';
            name.textContent = layer.name;
            
            const visibilityToggle = document.createElement('div');
            visibilityToggle.className = 'layer-visibility';
            visibilityToggle.innerHTML = layer.visible ? 
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' : 
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
            
            visibilityToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                redrawCanvas();
                updateLayerList();
            });
            
            layerElement.appendChild(thumbnail);
            layerElement.appendChild(name);
            layerElement.appendChild(visibilityToggle);
            
            // Select layer on click
            layerElement.addEventListener('click', () => {
                setCurrentLayer(index);
            });
            
            container.appendChild(layerElement);
        });
        
        // Update thumbnails
        updateLayerThumbnails();
    }
    
    // Set current layer
    function setCurrentLayer(index) {
        if (index >= 0 && index < layers.length) {
            currentLayer = layers[index];
            
            // Update UI
            document.querySelectorAll('.layer').forEach((el) => {
                const layerIndex = parseInt(el.dataset.index);
                if (layerIndex === index) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
        }
    }
    
    // Set brush tool
    function setBrushTool() {
        currentTool = 'brush';
        isEraser = false;
        canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23ff6b9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>'), auto`;
        
        // Update tool buttons
        updateToolButtons();
    }
    
    // Toggle eraser tool
    function toggleEraser() {
        if (currentTool === 'eraser') {
            setBrushTool();
        } else {
            currentTool = 'eraser';
            isEraser = true;
            canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23ff6b9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>'), auto`;
            
            // Update tool buttons
            updateToolButtons();
        }
    }
    
    // Set fill tool
    function setFillTool() {
        currentTool = 'fill';
        isEraser = false;
        canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23ff6b9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>'), auto`;
        
        // Update tool buttons
        updateToolButtons();
    }
    
    // Set color picker tool
    function setPickerTool() {
        currentTool = 'picker';
        isEraser = false;
        canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23ff6b9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"></path><path d="M4.93 10H19.07"></path><path d="M12 22v-8"></path><path d="M20 16.5v-9A1.5 1.5 0 0 0 18.5 6h-13A1.5 1.5 0 0 0 4 7.5v9A1.5 1.5 0 0 0 5.5 18h13a1.5 1.5 0 0 0 1.5-1.5z"></path></svg>'), auto`;
        
        // Update tool buttons
        updateToolButtons();
    }
    
    // Update tool buttons in UI
    function updateToolButtons() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (currentTool === 'brush') {
            const brushBtn = document.getElementById('brush-btn');
            if (brushBtn) brushBtn.classList.add('active');
        } else if (currentTool === 'eraser') {
            const eraserBtn = document.getElementById('eraser-btn');
            if (eraserBtn) eraserBtn.classList.add('active');
        } else if (currentTool === 'fill') {
            const fillBtn = document.getElementById('fill-btn');
            if (fillBtn) fillBtn.classList.add('active');
        } else if (currentTool === 'picker') {
            const pickerBtn = document.getElementById('picker-btn');
            if (pickerBtn) pickerBtn.classList.add('active');
        }
    }
    
    // Set brush shape
    function setBrushShape(shape) {
        brushShape = shape;
        
        // Update UI
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (shape === 'round') {
            const roundBtn = document.getElementById('round-brush');
            if (roundBtn) roundBtn.classList.add('active');
        } else {
            const squareBtn = document.getElementById('square-brush');
            if (squareBtn) squareBtn.classList.add('active');
        }
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Undo: Ctrl+Z
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        
        // Redo: Ctrl+Y
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }
        
        // Toggle eraser: R
        if (e.key === 'r' || e.key === 'R') {
            toggleEraser();
        }
        
        // Fill tool: F
        if (e.key === 'f' || e.key === 'F') {
            setFillTool();
        }
        
        // Save: S
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            exportImage();
        }
        
        // Brush: B
        if (e.key === 'b' || e.key === 'B') {
            setBrushTool();
        }
        
        // Picker: P
        if (e.key === 'p' || e.key === 'P') {
            setPickerTool();
        }
    });
    
    // Export as image with transparency
    function exportImage() {
        // Create a new canvas for the export
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Ensure transparent background
        exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw visible layers
        layers.forEach(layer => {
            if (layer.visible) {
                exportCtx.drawImage(layer.canvas, 0, 0);
            }
        });
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'ciona-drawing.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }
    
    // Connect UI events if elements exist
    function connectUIEvents() {
        // Set up tool button event listeners
        const brushBtn = document.getElementById('brush-btn');
        if (brushBtn) brushBtn.addEventListener('click', setBrushTool);
        
        const eraserBtn = document.getElementById('eraser-btn');
        if (eraserBtn) eraserBtn.addEventListener('click', toggleEraser);
        
        const fillBtn = document.getElementById('fill-btn');
        if (fillBtn) fillBtn.addEventListener('click', setFillTool);
        
        const pickerBtn = document.getElementById('picker-btn');
        if (pickerBtn) pickerBtn.addEventListener('click', setPickerTool);
        
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) undoBtn.addEventListener('click', undo);
        
        const redoBtn = document.getElementById('redo-btn');
        if (redoBtn) redoBtn.addEventListener('click', redo);
        
        // Set up brush shape event listeners
        const roundBtn = document.getElementById('round-brush');
        if (roundBtn) roundBtn.addEventListener('click', () => setBrushShape('round'));
        
        const squareBtn = document.getElementById('square-brush');
        if (squareBtn) squareBtn.addEventListener('click', () => setBrushShape('square'));
        
        // Layer controls
        const newLayerBtn = document.getElementById('new-layer-btn');
        if (newLayerBtn) {
            newLayerBtn.addEventListener('click', () => {
                addLayer();
                saveState();
            });
        }
        
        const deleteLayerBtn = document.getElementById('delete-layer-btn');
        if (deleteLayerBtn) {
            deleteLayerBtn.addEventListener('click', () => {
                if (layers.length <= 1) return; // Don't delete the last layer
                
                const currentIndex = layers.indexOf(currentLayer);
                layers.splice(currentIndex, 1);
                
                // Select another layer
                setCurrentLayer(Math.min(currentIndex, layers.length - 1));
                updateLayerList();
                redrawCanvas();
                saveState();
            });
        }
        
        // Brush controls
        const brushSizeSlider = document.getElementById('brush-size');
        if (brushSizeSlider) {
            brushSizeSlider.addEventListener('input', (e) => {
                brush.size = parseInt(e.target.value);
                const sizeValueElem = document.getElementById('size-value');
                if (sizeValueElem) sizeValueElem.textContent = `${brush.size}px`;
            });
        }
        
        const brushOpacitySlider = document.getElementById('brush-opacity');
        if (brushOpacitySlider) {
            brushOpacitySlider.addEventListener('input', (e) => {
                brush.opacity = parseInt(e.target.value) / 100;
                const opacityValueElem = document.getElementById('opacity-value');
                if (opacityValueElem) opacityValueElem.textContent = `${Math.round(brush.opacity * 100)}%`;
            });
        }
        
        const colorValueInput = document.getElementById('color-value');
        if (colorValueInput) {
            colorValueInput.addEventListener('input', (e) => {
                brush.color = e.target.value;
                const currentColorElem = document.getElementById('current-color');
                if (currentColorElem) currentColorElem.style.backgroundColor = brush.color;
            });
        }
        
        // Set initial color
        const currentColorElem = document.getElementById('current-color');
        if (currentColorElem) {
            currentColorElem.addEventListener('click', () => {
                const colorValueElem = document.getElementById('color-value');
                if (colorValueElem) brush.color = colorValueElem.value;
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportImage);
    }
    
    // Initial setup
    createBackgroundLayer();
    connectUIEvents();
    
    return {
        redrawCanvas,
        addLayer,
        setCurrentLayer,
        updateLayerList,
        toggleEraser,
        setFillTool,
        setBrushTool,
        setPickerTool,
        undo,
        redo,
        setBrushShape,
        exportImage
    };
}