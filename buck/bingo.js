// Clean, functional bingo game
class BingoGame {
    constructor() {
        this.isDrawing = false;
        this.isMuted = false;
        this.recentDraws = this.loadRecentDraws();
        
        // DOM elements
        this.canvas = document.getElementById('ball3d');
        this.resultCanvas = document.getElementById('resultBall3d');
        this.mainNumber = document.getElementById('mainNumber');
        this.mainLetter = document.getElementById('mainLetter');
        this.resultOverlay = document.getElementById('resultOverlay');
        this.resultBall = document.getElementById('resultBall');
        this.resultNumber = document.getElementById('resultNumber');
        this.resultLetter = document.getElementById('resultLetter');
        this.resultTitle = document.getElementById('resultTitle');
        this.recentList = document.getElementById('recentList');
        this.muteBtn = document.getElementById('muteButton');
        
        // Audio
        this.drawSound = document.getElementById('drawSound');
        this.resultSound = document.getElementById('resultSound');
        
        // Three.js setup
        this.setup3DBall();
        this.setupResultBall();
        
        this.init();
    }
    
    setup3DBall() {
        // Scene setup
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        this.camera.position.z = 3;
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
        this.renderer.setClearColor(0x000000, 0);
        
        // Sphere geometry
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Create a canvas texture with dots painted on it
        const texture = this.createDotTexture();
        
        // Material with color and texture overlay
        this.ballMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF5555,
            shininess: 80,
            specular: 0xffffff,
            emissive: 0x111111
        });
        
        // Create a second material for the dots with transparency
        const dotTextureMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1,
            depthTest: true,
            depthWrite: false
        });
        
        this.sphere = new THREE.Mesh(geometry, this.ballMaterial);
        this.scene.add(this.sphere);
        
        // Add dot overlay layer
        const dotGeometry = new THREE.SphereGeometry(1.001, 64, 64);
        this.dotLayer = new THREE.Mesh(dotGeometry, dotTextureMaterial);
        this.sphere.add(this.dotLayer);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, -5, 5);
        this.scene.add(pointLight);
        
        // Animation loop
        this.animate3DBall();
    }
    
    createDotTexture(number = null) {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Fully transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw solid white circles
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        
        // Four perfect circles around the equator
        const equatorDots = [
            { x: 0.125, y: 0.5 },
            { x: 0.375, y: 0.5 },
            { x: 0.625, y: 0.5 },
            { x: 0.875, y: 0.5 }
        ];
        
        equatorDots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(
                dot.x * canvas.width, 
                dot.y * canvas.height, 
                200, 
                0, 
                Math.PI * 2
            );
            ctx.fill();
            
            // Add black text in the center of each dot (either "?" or the number)
            const displayText = number !== null ? number.toString() : '?';
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.font = 'bold 200px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayText, dot.x * canvas.width, dot.y * canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        });
        
        // Top pole - draw solid band at top edge (they wrap to meet at pole)
        ctx.fillRect(0, 0, canvas.width, 280);
        
        // Bottom pole - draw solid band at bottom edge (slightly smaller)
        ctx.fillRect(0, canvas.height - 280, canvas.width, 280);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    

    
    animate3DBall() {
        requestAnimationFrame(() => this.animate3DBall());
        
        if (!this.isDrawing) {
            // Gentle idle rotation - only horizontal spin
            this.sphere.rotation.y += 0.005;
            
            // Cycle through colors smoothly
            const time = Date.now() * 0.001; // Convert to seconds
            const hue = (time * 50) % 360; // Full color cycle every ~7 seconds
            this.ballMaterial.color.setHSL(hue / 360, 0.7, 0.5);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    setBallColor(color) {
        if (this.ballMaterial) {
            this.ballMaterial.color.setStyle(color);
        }
    }
    
    updateBallTexture(number) {
        // Create new texture with the number instead of "?"
        const texture = this.createDotTexture(number);
        if (this.dotLayer) {
            this.dotLayer.material.map = texture;
            this.dotLayer.material.needsUpdate = true;
        }
    }
    
    setupResultBall() {
        if (!this.resultCanvas) {
            console.error('Result canvas not found');
            return;
        }
        
        // Create separate scene for result ball
        this.resultScene = new THREE.Scene();
        
        // Camera
        this.resultCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        this.resultCamera.position.z = 3;
        
        // Renderer
        this.resultRenderer = new THREE.WebGLRenderer({ 
            canvas: this.resultCanvas, 
            alpha: true,
            antialias: true 
        });
        this.resultRenderer.setSize(400, 400);
        this.resultRenderer.setClearColor(0x000000, 0);
        
        // Sphere geometry
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Material
        this.resultBallMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF5555,
            shininess: 80,
            specular: 0xffffff,
            emissive: 0x111111
        });
        
        this.resultSphere = new THREE.Mesh(geometry, this.resultBallMaterial);
        this.resultScene.add(this.resultSphere);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.resultScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.resultScene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, -5, 5);
        this.resultScene.add(pointLight);
    }
    
    updateResultBall(number, color) {
        if (!this.resultScene || !this.resultRenderer) {
            console.error('Result ball not initialized');
            return;
        }
        
        // Update texture with number
        const texture = this.createDotTexture(number);
        const dotTextureMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1,
            depthTest: true,
            depthWrite: false
        });
        
        // Remove old dot layer if exists
        if (this.resultDotLayer) {
            this.resultSphere.remove(this.resultDotLayer);
        }
        
        // Add new dot layer
        const dotGeometry = new THREE.SphereGeometry(1.001, 64, 64);
        this.resultDotLayer = new THREE.Mesh(dotGeometry, dotTextureMaterial);
        this.resultSphere.add(this.resultDotLayer);
        
        // Update color
        this.resultBallMaterial.color.setStyle(color);
        
        // Set rotation to show center dot (first equator dot is at x: 0.125, which is ~45 degrees)
        this.resultSphere.rotation.y = Math.PI * 0.25; // Rotate to show first dot centered
        this.resultSphere.rotation.x = 0;
        this.resultSphere.rotation.z = 0;
        
        // Initial render
        this.resultRenderer.render(this.resultScene, this.resultCamera);
        
        // Start animation
        this.animateResultBall();
    }
    
    animateResultBall() {
        // Gentle rotation for result ball
        const animate = () => {
            if (this.resultOverlay && this.resultOverlay.classList.contains('show')) {
                this.resultSphere.rotation.y += 0.01;
                this.resultRenderer.render(this.resultScene, this.resultCamera);
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    spinBall() {
        const spinDuration = 2000;
        const startTime = Date.now();
        
        const spin = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / spinDuration;
            
            if (progress < 1) {
                // Fast horizontal spin only
                this.sphere.rotation.y += 0.2;
                requestAnimationFrame(spin);
            }
        };
        
        spin();
    }
    
    init() {
        this.setupEventListeners();
        this.updateRecentList();
        this.setupModeIntegration();
        console.log('Bingo game initialized successfully');
    }
    
    setupEventListeners() {
        // Click anywhere to draw
        document.addEventListener('click', (e) => {
            // Don't draw if clicking on recent draws or result overlay
            if (this.recentList && this.recentList.contains(e.target)) return;
            if (this.resultOverlay && this.resultOverlay.contains(e.target)) return;
            if (this.muteBtn && this.muteBtn.contains(e.target)) return;
            
            if (!this.isDrawing && !this.resultOverlay.classList.contains('show')) {
                this.drawBall();
            }
        });
        
        // Mute button
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMute();
            });
        }
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'Enter') && !this.isDrawing) {
                e.preventDefault();
                this.drawBall();
            }
        });
        
        // Close result overlay on click
        if (this.resultOverlay) {
            this.resultOverlay.addEventListener('click', () => {
                this.hideResult();
            });
        }
    }
    
    getBallInfo(number) {
        // Color by groups of 10
        if (number >= 1 && number <= 10) return { color: '#FF6B6B', name: 'Red' };
        if (number >= 11 && number <= 20) return { color: '#4ECDC4', name: 'Teal' };
        if (number >= 21 && number <= 30) return { color: '#45B7D1', name: 'Blue' };
        if (number >= 31 && number <= 40) return { color: '#96CEB4', name: 'Green' };
        if (number >= 41 && number <= 50) return { color: '#FFEAA7', name: 'Yellow' };
        if (number >= 51 && number <= 60) return { color: '#DDA0DD', name: 'Purple' };
        if (number >= 61 && number <= 70) return { color: '#FFB347', name: 'Orange' };
        if (number >= 71 && number <= 80) return { color: '#FF69B4', name: 'Pink' };
        if (number >= 81 && number <= 90) return { color: '#20B2AA', name: 'Turquoise' };
        return { color: '#333', name: 'Black' };
    }
    
    async drawBall() {
        console.log('Drawing ball...');
        if (this.isDrawing) return;
        
        this.isDrawing = true;
        
        // Start 3D ball spinning
        this.spinBall();
        
        // Play draw sound
        this.playSound(this.drawSound);
        
        // Generate random number
        const number = Math.floor(Math.random() * 90) + 1;
        const ballInfo = this.getBallInfo(number);
        
        console.log(`Drew number: ${number}, color: ${ballInfo.color}`);
        
        // Wait for animation (1 second before showing number)
        await this.delay(1000);
        
        // Update texture to show the number
        this.updateBallTexture(number);
        
        // Wait another second with number visible
        await this.delay(1000);
        
        // Update 3D ball color
        this.setBallColor(ballInfo.color);
        
        // Update main display
        if (this.mainNumber) {
            this.mainNumber.textContent = number;
            this.mainNumber.style.display = 'none';
        }
        
        console.log('Updated display with number:', number);
        
        // Play result sound
        this.playSound(this.resultSound);
        
        // Save to history
        this.saveResult(number, ballInfo);
        
        // Show result overlay
        setTimeout(() => {
            this.showResult(number, ballInfo);
        }, 500);
        
        // Reset after delay
        setTimeout(() => {
            this.resetGame();
        }, 4000);
    }
    
    showResult(number, ballInfo) {
        // Update the 3D result ball
        this.updateResultBall(number, ballInfo.color);
        
        // Update title color to match ball
        if (this.resultTitle) {
            this.resultTitle.style.color = ballInfo.color;
        }
        
        if (this.resultOverlay) this.resultOverlay.classList.add('show');
    }
    
    hideResult() {
        if (this.resultOverlay) this.resultOverlay.classList.remove('show');
    }
    
    resetGame() {
        this.hideResult();
        this.isDrawing = false;
        
        // Reset display after a moment
        setTimeout(() => {
            if (this.mainNumber) {
                this.mainNumber.textContent = '?';
                this.mainNumber.style.display = 'none';
            }
            this.setBallColor('#4ECDC4'); // Reset to default teal color
        }, 1000);
    }
    
    saveResult(number, ballInfo) {
        console.log('Saving result:', number);
        
        const result = {
            number,
            color: ballInfo.color,
            timestamp: new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        this.recentDraws.unshift(result);
        
        // Keep only last 10
        if (this.recentDraws.length > 10) {
            this.recentDraws = this.recentDraws.slice(0, 10);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('buckBingoRecentDraws', JSON.stringify(this.recentDraws));
            console.log('Saved to localStorage');
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
        
        this.updateRecentList();
    }
    
    loadRecentDraws() {
        try {
            const saved = localStorage.getItem('buckBingoRecentDraws');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading recent draws:', e);
            return [];
        }
    }
    
    updateRecentList() {
        if (!this.recentList) {
            console.error('Recent list element not found');
            return;
        }
        
        if (this.recentDraws.length === 0) {
            this.recentList.innerHTML = '<div class="no-draws">No numbers drawn yet</div>';
            return;
        }
        
        this.recentList.innerHTML = this.recentDraws.map(draw => `
            <div class="recent-item">
                <div class="recent-ball" style="--ball-color: ${draw.color || '#fff'}; border-color: ${draw.color || '#333'}">
                    <span>${draw.number}</span>
                </div>
            </div>
        `).join('');
        
        console.log('Updated recent list with', this.recentDraws.length, 'items');
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.muteBtn) this.muteBtn.classList.toggle('muted', this.isMuted);
        
        // Update audio volumes
        if (this.drawSound) this.drawSound.muted = this.isMuted;
        if (this.resultSound) this.resultSound.muted = this.isMuted;
        
        console.log(`Audio ${this.isMuted ? 'muted' : 'unmuted'}`);
    }
    
    playSound(audio) {
        if (!audio || this.isMuted) return;
        
        try {
            audio.currentTime = 0;
            audio.play().catch(e => {
                console.log('Audio play failed:', e.message);
            });
        } catch (e) {
            console.log('Audio error:', e.message);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Integration with existing mode system
    setupModeIntegration() {
        const MODE_STORAGE_KEY = 'buckWheelMode'; // namespaced so this venue never shares state with the main wheel
        
        // Listen for changes
        window.addEventListener('storage', (event) => {
            if (event.key === MODE_STORAGE_KEY) {
                const newMode = event.newValue;
                if (newMode && newMode !== 'bingo') {
                    this.redirectToMode(newMode);
                }
            }
        });
    }
    
    redirectToMode(mode) {
        console.log(`Redirecting to mode: ${mode}`);
        switch (mode) {
            case 'timer':
                window.location.href = 'timer.html';
                break;
            case 'darts':
                window.location.href = 'darts.html';
                break;
            default:
                window.location.href = 'index.html';
                break;
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing bingo game...');
    window.bingoGame = new BingoGame();
});