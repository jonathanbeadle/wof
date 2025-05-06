// filepath: c:/Users/jonny/WOF/wof/timer-new.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timerDisplay = document.getElementById('timerDisplay');
    const gameStatus = document.getElementById('gameStatus');
    const startButton = document.getElementById('startButton');
    const resultModal = document.getElementById('resultModal');
    const resultHeader = document.getElementById('resultHeader');
    const resultText = document.getElementById('resultText');
    const resultTiming = document.getElementById('resultTiming');
    const particleCanvas = document.getElementById('particleCanvas');
    const particleCtx = particleCanvas.getContext('2d');
    const muteButton = document.getElementById('muteButton');

    // Audio elements
    const tickSound = document.getElementById('tickSound');
    const winSound = document.getElementById('winSound');
    const loseSound = document.getElementById('loseSound');
    const tensionSound = document.getElementById('tensionSound');

    // Set initial volumes
    tickSound.volume = 0.3;
    winSound.volume = 0.7;
    loseSound.volume = 0.5;
    tensionSound.volume = 0.4;

    // Game state
    let gameState = {
        isRunning: false,
        startTime: 0,
        currentTime: 0,
        tickInterval: null,
        targetTime: 10.00, // Target is exactly 10 seconds
        isMuted: false
    };

    // Set up the particle canvas dimensions
    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particles system
    class Particle {
        constructor(x, y, color, size, speedX, speedY) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = size;
            this.speedX = speedX;
            this.speedY = speedY;
            this.gravity = 0.03; // Reduced gravity for longer air time
            this.friction = 0.995; // Higher friction value makes particles slow down more gradually
            this.life = 200; // Doubled life span of the particle
        }

        update() {
            this.speedY += this.gravity;
            this.x += this.speedX;
            this.y += this.speedY;
            this.speedX *= this.friction;
            this.speedY *= this.friction;
            this.life -= 1;
            return this.life > 0;
        }

        draw() {
            particleCtx.globalAlpha = this.life / 200; // Adjusted for longer life
            particleCtx.fillStyle = this.color;
            particleCtx.beginPath();
            particleCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            particleCtx.closePath();
            particleCtx.fill();
        }
    }

    let particles = [];

    // Create explosion effect
    function createExplosion(x, y, count, isWin) {
        const colors = isWin ? 
            ['#FFD700', '#FFA500', '#FF4500', '#FF0000', '#FFFF00'] : 
            ['#FF4500', '#FF6347', '#FF0000', '#8B0000', '#A9A9A9'];
            
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 12 + 4; // Larger particles (was 8+2)
            const speedX = (Math.random() - 0.5) * 15; // Faster horizontal speed for wider spread
            const speedY = (Math.random() - 0.5) * 15; // Faster vertical speed for higher/lower travel
            const color = colors[Math.floor(Math.random() * colors.length)];
            particles.push(new Particle(x, y, color, size, speedX, speedY));
        }
    }

    // Update and draw all particles
    function updateParticles() {
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        
        // Update and filter out dead particles
        particles = particles.filter(particle => {
            const isAlive = particle.update();
            if (isAlive) particle.draw();
            return isAlive;
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(updateParticles);
        }
    }

    // Format time to display two decimal places (seconds.centiseconds)
    function formatTime(timeInSeconds) {
        const seconds = Math.floor(timeInSeconds);
        const centiseconds = Math.floor((timeInSeconds - seconds) * 100);
        return `${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }

    // Start the game timer
    function startGame() {
        if (gameState.isRunning) return;
        
        gameState.isRunning = true;
        gameState.startTime = Date.now();
        startButton.textContent = "STOP";
        startButton.classList.add('stop-button');
        gameStatus.textContent = "";
        
        if (!gameState.isMuted) {
            tensionSound.currentTime = 0;
            tensionSound.play();
        }
        
        // Change the color and animation of the timer as we get closer to 10 seconds
        timerDisplay.classList.add('game-active');
        
        gameState.tickInterval = setInterval(() => {
            const elapsedMs = Date.now() - gameState.startTime;
            gameState.currentTime = elapsedMs / 1000;
            timerDisplay.textContent = formatTime(gameState.currentTime);
            
            // Play tick sound every second
            if (Math.floor(gameState.currentTime) > Math.floor((elapsedMs - 100) / 1000) && !gameState.isMuted) {
                tickSound.currentTime = 0;
                tickSound.play();
            }
            
            // Change visual feedback as we approach 10 seconds
            if (gameState.currentTime >= 8 && gameState.currentTime < 9) {
                timerDisplay.classList.remove('game-active');
                timerDisplay.classList.add('game-close');
            } else if (gameState.currentTime >= 9) {
                timerDisplay.classList.remove('game-close');
                timerDisplay.classList.add('game-critical');
            }
            
            // Auto-stop if we go way over time (15 seconds)
            if (gameState.currentTime > 15) {
                stopGame();
            }
        }, 10); // Update every 10ms for smooth display
    }

    // Stop the game and check the result
    function stopGame() {
        if (!gameState.isRunning) return;
        
        clearInterval(gameState.tickInterval);
        gameState.isRunning = false;
        
        const finalTime = gameState.currentTime;
        // Win only if time is exactly 10.00 seconds (absolutely no margin for error)
        const isWin = Math.round(finalTime * 100) / 100 === 10.00; // Must be exactly 10.00
        
        tensionSound.pause();
        
        // Reset button appearance
        startButton.textContent = "START GAME";
        startButton.classList.remove('stop-button');
        
        // Check how far off they were from 10 seconds
        const timeOffset = Math.abs(finalTime - 10.00);
        const isWayOff = timeOffset > 1.00;
        
        // Display the result
        resultHeader.textContent = isWin ? "YOU WIN!" : (isWayOff ? "USELESS" : "SO CLOSE!");
        resultHeader.className = 'result-header ' + (isWin ? 'win-header' : 'lose-header');
        
        resultText.innerHTML = isWin 
            ? "CONGRATULATIONS!<br>You've Won Free Drinks!" 
            : isWayOff ? "You were nowhere near!" : "You didn't hit exactly 10.00!";
        
        resultTiming.textContent = `Your time: ${formatTime(finalTime)} seconds`;
        
        // Play sound effect
        if (!gameState.isMuted) {
            if (isWin) {
                winSound.currentTime = 0;
                winSound.play();
            } else {
                loseSound.currentTime = 0;
                loseSound.play();
            }
        }
        
        // Only create particle effect for wins
        if (isWin) {
            createWinExplosions();
        }
        
        updateParticles();
        
        // Show result modal with slight delay
        setTimeout(() => {
            resultModal.style.display = 'flex';
            
            // Auto-close the modal after 5 seconds and reset the game
            setTimeout(() => {
                resultModal.style.display = 'none';
                resetGame();
            }, 5000);
        }, 500);
    }

    // Create multiple explosions for a win
    function createWinExplosions() {
        // Create a big center explosion
        createExplosion(
            particleCanvas.width / 2, 
            particleCanvas.height / 2, 
            300, // Increased from 200
            true
        );
        
        // Create corner explosions
        createExplosion(0, 0, 75, true); // Increased from 50
        createExplosion(particleCanvas.width, 0, 75, true);
        createExplosion(0, particleCanvas.height, 75, true);
        createExplosion(particleCanvas.width, particleCanvas.height, 75, true);
        
        // Create more random explosions - increased count and duration
        for (let i = 0; i < 12; i++) { // Increased from 5 to 12 explosions
            setTimeout(() => {
                const x = Math.random() * particleCanvas.width;
                const y = Math.random() * particleCanvas.height;
                createExplosion(x, y, 150, true); // Increased from 100 to 150 particles
            }, i * 400); // Spread out over longer time (was 300ms)
        }
        
        // Add a second wave of explosions
        setTimeout(() => {
            createExplosion(
                particleCanvas.width / 2, 
                particleCanvas.height / 2, 
                250,
                true
            );
            
            // Add a few more random ones
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const x = Math.random() * particleCanvas.width;
                    const y = Math.random() * particleCanvas.height;
                    createExplosion(x, y, 100, true);
                }, i * 300 + 500);
            }
        }, 2000); // Second wave after 2 seconds
    }

    // Reset the game to play again
    function resetGame() {
        timerDisplay.textContent = "00.00";
        gameStatus.textContent = ""; // Removed the start text
        startButton.textContent = "START GAME";
        startButton.classList.remove('stop-button');
        resultModal.style.display = 'none';
        
        // Reset timer classes
        timerDisplay.classList.remove('game-active', 'game-close', 'game-critical');
        
        // Clear any remaining particles
        particles = [];
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    }

    // Toggle mute state
    function toggleMute() {
        gameState.isMuted = !gameState.isMuted;
        muteButton.classList.toggle('muted', gameState.isMuted);
        
        // Set volume for all audio elements
        tickSound.volume = gameState.isMuted ? 0 : 0.3;
        winSound.volume = gameState.isMuted ? 0 : 0.7;
        loseSound.volume = gameState.isMuted ? 0 : 0.5;
        tensionSound.volume = gameState.isMuted ? 0 : 0.4;
    }

    // Event Listeners
    startButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent body click from triggering
        if (!gameState.isRunning) {
            startGame();
        } else {
            stopGame();
        }
    });

    // Only listen for click events on the game areas, not buttons
    document.addEventListener('click', function(e) {
        // Don't trigger if clicking on buttons or modal
        if (e.target.tagName !== 'BUTTON' && 
            !resultModal.contains(e.target) && 
            !muteButton.contains(e.target)) {
            if (!gameState.isRunning) {
                startGame();
            } else {
                stopGame();
            }
        }
    });

    muteButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent body click
        toggleMute();
    });

    // Initialize the game
    resetGame();
});
