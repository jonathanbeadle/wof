// ========================================
// BULLSEYE DIFFICULTY CONFIGURATION
// ========================================
// Adjust this single value to make the bullseye easier or harder to hit:
// 25 = Normal difficulty (default dartboard size)
// 30-40 = Easier (larger bullseye)
// 15-20 = Harder (smaller bullseye)
// 10 = Very hard (tiny bullseye)
const BULLSEYE_DIFFICULTY_RADIUS = 25;
// ========================================

class DartsGame {
    constructor() {
        this.canvas = document.getElementById('dartboardCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particleCanvas = document.getElementById('particleCanvas');
        this.particleCtx = this.particleCanvas.getContext('2d');
        this.dartboardContainer = document.getElementById('dartboardContainer');
        
        // Game elements
        this.gameStatus = document.getElementById('gameStatus');
        this.resultModal = document.getElementById('resultModal');
        this.aimingReticle = document.getElementById('aimingReticle');
        this.dartHit = document.getElementById('dartHit');
        this.playAgainButton = document.getElementById('playAgainButton');
        
        // Audio elements
        this.muteButton = document.getElementById('muteButton');
        this.aimSound = document.getElementById('aimSound');
        this.throwSound = document.getElementById('throwSound');
        this.winSound = document.getElementById('winSound');
        this.loseSound = document.getElementById('loseSound');
        this.bullseyeSound = document.getElementById('bullseyeSound');
        
        // Game state
        this.gameState = 'waiting'; // waiting, aimingX, aimingY, thrown, finished
        this.isMuted = false;
        this.dartboardRadius = 390;
        this.bullseyeRadius = BULLSEYE_DIFFICULTY_RADIUS; // Use configurable radius
        this.outerBullRadius = 60; // Outer bull (25 point area)
        this.aimPosition = { x: 0, y: 0 };
        this.currentAimPos = { x: 0, y: 0 };
        this.animationId = null;
        this.baseAimSpeed = 4; // Base speed
        this.aimSpeed = 4; // Current dynamic speed
        this.speedVariation = 0; // Current speed variation
        this.speedChangeTimer = 0; // Timer for speed changes
        this.speedChangeInterval = 30; // Frames between speed changes
        this.aimDirection = 1;
        this.particles = [];
        this.lastClickTime = 0;
        this.clickCooldown = 500; // 500ms cooldown between clicks to prevent issues
        this.modalCloseTimer = null; // Track auto-close timer
        this.modalCloseable = false; // Flag to control when modal can be closed
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.drawDartboard();
        this.setupEventListeners();
        this.setupMuteButton();
        this.startParticleSystem();
        
        // Log current bullseye difficulty setting
        console.log(`🎯 Darts Game Initialized - Bullseye Radius: ${BULLSEYE_DIFFICULTY_RADIUS}px (${BULLSEYE_DIFFICULTY_RADIUS > 30 ? 'EASY' : BULLSEYE_DIFFICULTY_RADIUS > 20 ? 'NORMAL' : BULLSEYE_DIFFICULTY_RADIUS > 15 ? 'HARD' : 'VERY HARD'})`);
        
        // Game ready - no status text needed
    }
    
    setupCanvas() {
        // Set up main canvas - much bigger dartboard
        this.canvas.width = 800;
        this.canvas.height = 800;
        this.dartboardRadius = 380; // Leave some margin
        this.bullseyeRadius = BULLSEYE_DIFFICULTY_RADIUS; // Use configurable radius
        this.outerBullRadius = 60; // Outer bull
        
        // Set up particle canvas
        this.particleCanvas.width = window.innerWidth;
        this.particleCanvas.height = window.innerHeight;
        
        // Adjust for mobile and smaller screens
        if (window.innerWidth < 1200) {
            this.canvas.width = window.innerWidth < 768 ? 500 : 650;
            this.canvas.height = this.canvas.width;
            this.dartboardRadius = this.canvas.width / 2 - 20;
            
            // Scale the configurable bullseye radius proportionally for smaller screens
            const scaleFactor = this.dartboardRadius / 380; // Ratio compared to full size
            this.bullseyeRadius = BULLSEYE_DIFFICULTY_RADIUS * scaleFactor;
            this.outerBullRadius = 60 * scaleFactor;
        }
    }
    
    setupEventListeners() {
        // Click anywhere on the dartboard container to control the game
        this.dartboardContainer.addEventListener('click', () => this.handleClick());
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.particleCanvas.width = window.innerWidth;
            this.particleCanvas.height = window.innerHeight;
        });
        
        // Play again button
        this.playAgainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeModal();
        });
        
        // Completely prevent all modal closing events except PLAY AGAIN button
        this.resultModal.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        });
        
        // Prevent any events on modal content from bubbling
        const modalContent = this.resultModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
        }
        
        // Prevent escape key from closing modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.resultModal.style.display === 'flex') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }
    
    setupMuteButton() {
        this.muteButton.addEventListener('click', () => {
            this.isMuted = !this.isMuted;
            this.muteButton.classList.toggle('muted', this.isMuted);
            
            // Mute/unmute all audio elements
            [this.aimSound, this.throwSound, this.winSound, this.loseSound, this.bullseyeSound].forEach(audio => {
                audio.muted = this.isMuted;
            });
        });
    }
    
    drawDartboard() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = this.dartboardRadius;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw outer black ring first
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        
        // Draw 20 sections with alternating colors
        this.drawDartboardSections(centerX, centerY, radius);
        
        // Draw the main scoring rings
        const rings = [
            // Double ring (outer)
            { innerRadius: radius * 0.82, outerRadius: radius * 0.95, isDouble: true },
            // Single outer
            { innerRadius: radius * 0.52, outerRadius: radius * 0.82, isDouble: false },
            // Treble ring
            { innerRadius: radius * 0.42, outerRadius: radius * 0.52, isTreeble: true },
            // Single inner
            { innerRadius: radius * 0.15, outerRadius: radius * 0.42, isDouble: false }
        ];
        
        rings.forEach(ring => {
            this.drawScoringRing(centerX, centerY, ring);
        });
        
        // Draw outer bull (25 points) - green
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#00AA00';
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw inner bull (bullseye - 50 points) - red
        // This uses the configurable BULLSEYE_DIFFICULTY_RADIUS
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.bullseyeRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#CC0000';
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Add outer border
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
    }
    
    drawDartboardSections(centerX, centerY, radius) {
        // Draw 20 sections like a real dartboard
        // Offset by half a section so the top section is centered at 12 o'clock
        const sections = 20;
        const angleStep = (2 * Math.PI) / sections;
        const offsetAngle = angleStep / 2; // Half section offset to center top section
        
        for (let i = 0; i < sections; i++) {
            const startAngle = i * angleStep - Math.PI / 2 + offsetAngle;
            const endAngle = (i + 1) * angleStep - Math.PI / 2 + offsetAngle;
            
            // Alternate colors for sections (black and cream/white)
            const isEven = i % 2 === 0;
            const lightColor = '#F5F5DC'; // Cream color
            const darkColor = '#000000';   // Black
            
            // Draw the main section (single scoring area)
            this.drawSection(centerX, centerY, radius * 0.52, radius * 0.82, startAngle, endAngle, 
                isEven ? lightColor : darkColor);
            
            // Draw inner single area
            this.drawSection(centerX, centerY, radius * 0.15, radius * 0.42, startAngle, endAngle, 
                isEven ? lightColor : darkColor);
        }
    }
    
    drawScoringRing(centerX, centerY, ring) {
        const sections = 20;
        const angleStep = (2 * Math.PI) / sections;
        const offsetAngle = angleStep / 2; // Same offset as main sections
        
        for (let i = 0; i < sections; i++) {
            const startAngle = i * angleStep - Math.PI / 2 + offsetAngle;
            const endAngle = (i + 1) * angleStep - Math.PI / 2 + offsetAngle;
            
            // Alternate colors for sections
            const isEven = i % 2 === 0;
            let color;
            
            if (ring.isDouble) {
                // Double ring - red on black sections (odd), green on cream sections (even)
                color = isEven ? '#00AA00' : '#CC0000';
            } else if (ring.isTreeble) {
                // Treble ring - red on black sections (odd), green on cream sections (even)  
                color = isEven ? '#00AA00' : '#CC0000';
            } else {
                // Single areas already drawn in main sections
                return;
            }
            
            this.drawSection(centerX, centerY, ring.innerRadius, ring.outerRadius, startAngle, endAngle, color);
        }
    }
    
    drawSection(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, color) {
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        this.ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    handleClick() {
        // Prevent rapid clicking
        const currentTime = Date.now();
        if (currentTime - this.lastClickTime < this.clickCooldown) {
            return;
        }
        this.lastClickTime = currentTime;
        
        if (this.gameState === 'waiting') {
            this.startGame();
        } else if (this.gameState === 'aimingX') {
            this.lockXPosition();
        } else if (this.gameState === 'aimingY') {
            this.lockYPosition();
        }
        // Ignore clicks if in 'thrown' or 'finished' state
    }
    
    startGame() {
        this.gameState = 'aimingX';
        
        // Reset dynamic speed variables for new game
        this.aimSpeed = this.baseAimSpeed;
        this.speedVariation = 0;
        this.speedChangeTimer = 0;
        this.speedChangeInterval = 30;
        
        this.aimingReticle.style.display = 'block';
        this.currentAimPos = { x: 50, y: this.canvas.height / 2 };
        
        this.playSound(this.aimSound);
        this.startAiming();
    }
    
    lockXPosition() {
        // Lock X position, start Y aiming
        this.aimPosition.x = this.currentAimPos.x;
        this.gameState = 'aimingY';
        this.aimDirection = 1;
        this.currentAimPos.x = this.aimPosition.x; // Keep X locked
        this.currentAimPos.y = 40; // Reset Y to top with margin
        
        // Reset dynamic speed variables for Y aiming phase
        this.aimSpeed = this.baseAimSpeed;
        this.speedVariation = 0;
        this.speedChangeTimer = 0;
        this.speedChangeInterval = 30;
        
        this.playSound(this.aimSound);
    }
    
    lockYPosition() {
        // Lock Y position and throw dart
        this.aimPosition.y = this.currentAimPos.y;
        this.throwDart();
    }
    
    startAiming() {
        // Cancel any existing animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const animate = () => {
            // Update dynamic speed for variable difficulty
            this.updateDynamicSpeed();
            
            if (this.gameState === 'aimingX') {
                // Move horizontally within canvas bounds
                this.currentAimPos.x += this.aimSpeed * this.aimDirection;
                
                if (this.currentAimPos.x <= 40 || this.currentAimPos.x >= this.canvas.width - 40) {
                    this.aimDirection *= -1;
                    this.currentAimPos.x = Math.max(40, Math.min(this.canvas.width - 40, this.currentAimPos.x));
                }
                
                this.updateReticlePosition();
            } else if (this.gameState === 'aimingY') {
                // Move vertically within canvas bounds
                this.currentAimPos.y += this.aimSpeed * this.aimDirection;
                
                if (this.currentAimPos.y <= 40 || this.currentAimPos.y >= this.canvas.height - 40) {
                    this.aimDirection *= -1;
                    this.currentAimPos.y = Math.max(40, Math.min(this.canvas.height - 40, this.currentAimPos.y));
                }
                
                this.updateReticlePosition();
            }
            
            if (this.gameState === 'aimingX' || this.gameState === 'aimingY') {
                this.animationId = requestAnimationFrame(animate);
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    updateReticlePosition() {
        // Position relative to the canvas element itself
        this.aimingReticle.style.left = this.currentAimPos.x + 'px';
        this.aimingReticle.style.top = this.currentAimPos.y + 'px';
    }
    
    updateDynamicSpeed() {
        // Update speed variation timer
        this.speedChangeTimer++;
        
        // Change speed variation every speedChangeInterval frames
        if (this.speedChangeTimer >= this.speedChangeInterval) {
            this.speedChangeTimer = 0;
            
            // Generate new speed variation between -2 and +3 for unpredictability
            // This creates speeds ranging from 2 to 7 (base 4 +/- variation)
            this.speedVariation = (Math.random() * 5) - 2;
            
            // Also randomize the interval for the next speed change (20-50 frames)
            this.speedChangeInterval = Math.floor(Math.random() * 30) + 20;
        }
        
        // Apply speed variation with smooth transitions using sine wave
        const smoothFactor = Math.sin((this.speedChangeTimer / this.speedChangeInterval) * Math.PI * 2) * 0.3;
        this.aimSpeed = this.baseAimSpeed + this.speedVariation + smoothFactor;
        
        // Ensure speed stays within reasonable bounds
        this.aimSpeed = Math.max(1.5, Math.min(8, this.aimSpeed));
    }
    
    lockPosition() {
        // This method is now replaced by handleClick logic
        // but keeping it for compatibility
        this.handleClick();
    }
    
    throwDart() {
        this.gameState = 'thrown';
        this.aimingReticle.style.display = 'none';
        
        this.playSound(this.throwSound);
        
        // Show dart hit position  
        this.dartHit.style.left = this.aimPosition.x + 'px';
        this.dartHit.style.top = this.aimPosition.y + 'px';
        this.dartHit.style.display = 'block';
        
        // Calculate if it's a bullseye
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const distance = Math.sqrt(
            Math.pow(this.aimPosition.x - centerX, 2) + 
            Math.pow(this.aimPosition.y - centerY, 2)
        );
        
        setTimeout(() => {
            this.showResult(distance);
        }, 1000);
    }
    
    showResult(distance) {
        this.gameState = 'finished';
        
        const isBullseye = distance <= this.bullseyeRadius;
        const isOuterBull = distance <= this.outerBullRadius;
        const isPoorEffort = distance > 100;
        const resultHeader = document.getElementById('resultHeader');
        const resultText = document.getElementById('resultText');
        const resultDistance = document.getElementById('resultDistance');
        
        if (isBullseye) {
            resultHeader.textContent = '🎯 BULLSEYE! 🎯';
            resultHeader.className = 'result-header win-header';
            resultText.innerHTML = 'PERFECT SHOT! Inner Bull!<br><strong>🍻 FREE ROUND 🍻</strong>';
            resultDistance.textContent = `Perfect! Distance from centre: ${Math.round(distance)}px`;
            
            this.playSound(this.bullseyeSound);
            this.createWinExplosions('bullseye');
            
        } else if (isOuterBull) {
            resultHeader.textContent = '🎯 OUTER BULL! 🎯';
            resultHeader.className = 'result-header win-header';
            resultText.innerHTML = 'NICE SHOT!<br><strong>🍻 10% OFF 🍻</strong>';
            resultDistance.textContent = `Excellent aim! Distance from centre: ${Math.round(distance)}px`;
            
            this.playSound(this.winSound);
            this.createWinExplosions('outer');
            
        } else if (isPoorEffort) {
            resultHeader.textContent = 'Poor effort!';
            resultHeader.className = 'result-header lose-header';
            resultText.textContent = 'Better luck next time!';
            resultDistance.textContent = `Distance from centre: ${Math.round(distance)}px`;
            
            this.playSound(this.loseSound);
            
        } else {
            resultHeader.textContent = 'Close, but no bull!';
            resultHeader.className = 'result-header lose-header';
            resultText.textContent = 'Better luck next time!';
            resultDistance.textContent = `Distance from centre: ${Math.round(distance)}px`;
            
            this.playSound(this.loseSound);
        }
        
        // Hide dart landing position when modal appears
        this.dartHit.style.display = 'none';
        
        // Show modal with flex display for centering
        this.resultModal.style.display = 'flex';
        this.modalCloseable = false; // Prevent immediate closing
        
        // Clear any existing timer
        if (this.modalCloseTimer) {
            clearTimeout(this.modalCloseTimer);
        }
        
        // Auto-close modal after 5 seconds
        this.modalCloseTimer = setTimeout(() => {
            if (this.resultModal.style.display === 'flex') {
                this.modalCloseable = true;
                this.closeModal();
            }
        }, 5000);
    }
    
    createCelebrationParticles() {
        // Legacy method - replaced by createWinExplosions
        this.createWinExplosions('legacy');
    }
    
    createWinExplosions(winType = 'bullseye') {
        // Configure settings based on win type
        let settings = {
            centerCount: 300,
            cornerCount: 75,
            randomExplosions: 12,
            randomParticles: 150,
            secondWave: true,
            secondWaveDelay: 2000,
            secondWaveCount: 250,
            additionalRandom: 5
        };
        
        // Adjust settings based on win type
        if (winType === 'outer') {
            // Outer bull - moderate celebration
            settings.centerCount = 200;
            settings.cornerCount = 50;
            settings.randomExplosions = 8;
            settings.randomParticles = 100;
            settings.secondWaveCount = 150;
            settings.additionalRandom = 3;
        } else if (winType === 'legacy') {
            // Legacy celebration
            settings.centerCount = 150;
            settings.cornerCount = 35;
            settings.randomExplosions = 5;
            settings.randomParticles = 70;
            settings.secondWave = false;
        }
        
        // Create a big center explosion
        this.createExplosion(
            this.particleCanvas.width / 2, 
            this.particleCanvas.height / 2, 
            settings.centerCount,
            winType
        );
        
        // Create corner explosions
        this.createExplosion(0, 0, settings.cornerCount, winType);
        this.createExplosion(this.particleCanvas.width, 0, settings.cornerCount, winType);
        this.createExplosion(0, this.particleCanvas.height, settings.cornerCount, winType);
        this.createExplosion(this.particleCanvas.width, this.particleCanvas.height, settings.cornerCount, winType);
        
        // Create more random explosions
        for (let i = 0; i < settings.randomExplosions; i++) {
            setTimeout(() => {
                const x = Math.random() * this.particleCanvas.width;
                const y = Math.random() * this.particleCanvas.height;
                this.createExplosion(x, y, settings.randomParticles, winType);
            }, i * 400);
        }
        
        // Add a second wave of explosions for better wins
        if (settings.secondWave) {
            setTimeout(() => {
                this.createExplosion(
                    this.particleCanvas.width / 2, 
                    this.particleCanvas.height / 2, 
                    settings.secondWaveCount,
                    winType
                );
                
                for (let i = 0; i < settings.additionalRandom; i++) {
                    setTimeout(() => {
                        const x = Math.random() * this.particleCanvas.width;
                        const y = Math.random() * this.particleCanvas.height;
                        this.createExplosion(x, y, 80, winType);
                    }, i * 200);
                }
            }, settings.secondWaveDelay);
        }
    }
    
    createExplosion(x, y, particleCount, winType) {
        const colors = winType === 'bullseye' 
            ? ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#FF0000', '#00FF00']
            : ['#FFD700', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                decay: Math.random() * 0.02 + 0.005,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    startParticleSystem() {
        const animate = () => {
            this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
            
            this.particles = this.particles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // Gravity
                particle.life -= particle.decay;
                
                this.particleCtx.globalAlpha = particle.life;
                this.particleCtx.fillStyle = particle.color;
                this.particleCtx.beginPath();
                this.particleCtx.arc(particle.x, particle.y, particle.size || 3, 0, 2 * Math.PI);
                this.particleCtx.fill();
                
                return particle.life > 0;
            });
            
            this.particleCtx.globalAlpha = 1;
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    closeModal() {
        // Clear the auto-close timer
        if (this.modalCloseTimer) {
            clearTimeout(this.modalCloseTimer);
            this.modalCloseTimer = null;
        }
        
        this.resultModal.style.display = 'none';
        this.modalCloseable = false; // Reset the flag
        // Reset to waiting state - game will start only when user clicks dartboard
        this.resetGame();
    }
    
    resetGame() {
        this.gameState = 'waiting';
        this.aimingReticle.style.display = 'none';
        this.dartHit.style.display = 'none';
        
        // Cancel any ongoing animations
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Reset positions
        this.aimPosition = { x: 0, y: 0 };
        this.currentAimPos = { x: 50, y: this.canvas.height / 2 };
        this.aimDirection = 1;
        
        // Clear any particles
        this.particles = [];
    }
    
    playSound(audio) {
        if (!this.isMuted && audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DartsGame();
});
