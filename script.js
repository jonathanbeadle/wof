const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const prizeModal = document.getElementById("prizeModal");
const prizeText = document.getElementById("prizeText");
const winsList = document.getElementById("winsList");
const MAX_RECENT_WINS = 5;  // Reduced from 10 to 5 to fit without scrolling

const PARTICLE_COUNT = 200; // Increased further from 100
const MAJOR_PRIZES = ["£100 Bar Tab", "£50 Bar Tab", "£25 Bar Tab", "Free Round"];

// Constants for spin animation (Original values - may be overridden by rewritten logic below)
let spinAnimation = null; // Keep for potential reference? Rewritten logic uses spinAnimationFrame
let tickInterval = 100; // Keep for potential reference? Rewritten logic calculates interval dynamically
const SPIN_DURATION = 8000; // Keep for potential reference? Rewritten logic uses SPIN_DURATION_MS
const TENSION_PHASE = 2500; // Keep for potential reference? Rewritten logic uses easing
const MIN_ROTATIONS = 10; // Keep for potential reference? Rewritten logic uses MIN_FULL_ROTATIONS

// Audio elements
const spinSound = document.getElementById("spinSound");
// const tickSound = document.getElementById("tickSound"); // Replaced by pool
const winSound = document.getElementById("winSound");
const tickSounds = Array.from(document.querySelectorAll('.tickSound')); // Get pool of tick sounds
const muteButton = document.getElementById("muteButton"); // Get mute button
let currentTickSoundIndex = 0; // Index for cycling through the pool
let isMuted = false; // Mute state tracker

// Control volume of sounds
const initialVolumes = {
    spin: 0.6,
    tick: 0.3, // Base volume, adjusted dynamically
    win: 0.8
};

spinSound.volume = initialVolumes.spin;
tickSounds.forEach(sound => sound.volume = initialVolumes.tick);
winSound.volume = initialVolumes.win;


// Global state variables needed by rewritten logic
let spinStartTime = 0; // Used by rewritten logic
let lastTickTime = 0; // Used by rewritten logic

// Original spinProgress - not used by rewritten logic
// let spinProgress = 0;

// Original stopIdleRotation - replaced by rewritten logic's version
/*
function stopIdleRotation() {
  isSpinning = true;
  // Set the transform directly to current rotation to stop any transitions
  canvas.style.transition = 'none';
  canvas.style.transform = `rotate(${currentRotationDeg}deg)`;
  // Force a reflow to ensure the transition is cleared
  canvas.offsetHeight;
}
*/

// Original tensionEasing - replaced by rewritten logic's easeOutQuint
/*
function tensionEasing(x) {
  // ... original easing logic ...
}
*/

// Original playTickSound - replaced by rewritten logic's version
/*
function playTickSound(currentTime, progress) {
  // ... original tick logic ...
}
*/

// ------------------------------------------------------------------
// 2. Visual Distribution (Moved Up)
// ------------------------------------------------------------------
const totalVisualSlices = 32;
const visualSegments = new Array(totalVisualSlices);
const initialOffsetDeg = -90; // Start with the line between slice 0 and 31 at the top

// Fixed assignments:
visualSegments[0]  = { prize: "£100 Bar Tab", color: "#e5cb5d" };
visualSegments[16] = { prize: "£50 Bar Tab", color: "#f64649" };
visualSegments[4]  = { prize: "Free Round", color: "#8549f6" };
visualSegments[12] = { prize: "Free Round", color: "#8549f6" };
visualSegments[20] = { prize: "Free Round", color: "#8549f6" };
visualSegments[28] = { prize: "Free Round", color: "#8549f6" };
visualSegments[8]  = { prize: "£25 Bar Tab", color: "#d12de6" };
visualSegments[24] = { prize: "£25 Bar Tab", color: "#d12de6" };
visualSegments[7]  = { prize: "25% Off", color: "#2c41af" };
visualSegments[9]  = { prize: "25% Off", color: "#2c41af" };
visualSegments[23] = { prize: "25% Off", color: "#2c41af" };
visualSegments[25] = { prize: "25% Off", color: "#2c41af" };
visualSegments[1]  = { prize: "Half Price Round", color: "#4b68ff" };
visualSegments[15] = { prize: "Half Price Round", color: "#4b68ff" };
visualSegments[17] = { prize: "Half Price Round", color: "#4b68ff" };
visualSegments[31] = { prize: "Half Price Round", color: "#4b68ff" };
// Remaining indices (16 total):
const remainingIndices = [2,3,5,6,10,11,13,14,18,19,21,22,26,27,29,30];
const freeRoundNeighbors = new Set([3,5,11,13,19,21,27,29]);
freeRoundNeighbors.forEach(idx => {
  visualSegments[idx] = { prize: "Full Price", color: "#333333" };
});
const leftover = remainingIndices.filter(idx => !freeRoundNeighbors.has(idx));
leftover.sort((a, b) => a - b);
for (let idx of leftover) {
  visualSegments[idx] = { prize: "10% Off", color: "#2a2f5b" };
}

let rainbowAngle = 0; // For rainbow border animation (Moved Up)

function easeInOutQuart(x) { // Keep if used elsewhere, otherwise potentially remove
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

function createParticle(x, y, color) {
  const particle = document.createElement('div');
  particle.style.cssText = `
    position: absolute;
    width: 8px;
    height: 8px;
    background: ${color};
    border-radius: 50%;
    pointer-events: none;
    left: ${x}px;
    top: ${y}px;
  `;
  return particle;
}

function animateParticles(container, color) {
  const particles = [];
  const rect = container.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = createParticle(centerX, centerY, color);
    container.appendChild(particle);
    particles.push({
      element: particle,
      angle: (Math.PI * 2 * i) / PARTICLE_COUNT,
      speed: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
      friction: 0.99,
      opacity: 1,
      x: centerX,
      y: centerY
    });
  }

  let frame = 0;
  function animate() {
    frame++;
    particles.forEach(p => {
      p.speed *= p.friction;
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;
      p.opacity -= 0.01;
      p.rotation += 5;

      p.element.style.transform = `translate(${p.x - centerX}px, ${p.y - centerY}px) rotate(${p.rotation}deg)`;
      p.element.style.opacity = Math.max(0, p.opacity);
    });

    if (frame < 100) requestAnimationFrame(animate);
    else particles.forEach(p => p.element.remove());
  }
  animate();
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  // Re-draw wheel after resize if needed, though CSS handles size
  drawWheel();
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function getRecentWins() {
  return JSON.parse(localStorage.getItem('recentWins') || '[]');
}

function saveRecentWin(prize, color) {
  const wins = getRecentWins();
  wins.unshift({
    prize,
    color,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  while (wins.length > MAX_RECENT_WINS) {
    wins.pop();
  }

  localStorage.setItem('recentWins', JSON.stringify(wins));
  updateWinsList();

  // Flash effect on the recent wins panel when new win is added
  const recentWinsPanel = document.querySelector('.recent-wins');
  recentWinsPanel.style.animation = 'none';
  recentWinsPanel.offsetHeight; // Trigger reflow
  recentWinsPanel.style.animation = 'glow 1s ease-in-out';
}

function updateWinsList() {
  const wins = getRecentWins();
  winsList.innerHTML = wins.map(win => `
    <div class="win-item" style="background: ${win.color}40; border: 2px solid ${win.color}">
      <span class="win-prize">${win.prize}</span>
      <span class="win-time">${win.timestamp}</span>
    </div>
  `).join('');
}

// Call this when page loads
updateWinsList();

// ------------------------------------------------------------------
// 1. True Weighted Distribution
// ------------------------------------------------------------------
const weightedDistribution = [
  { prize: "£100 Bar Tab", weight: 1, color: "#e5cb5d" },
  { prize: "£50 Bar Tab", weight: 2, color: "#f64649" },
  { prize: "£25 Bar Tab", weight: 4, color: "#d12de6" },
  { prize: "Free Round", weight: 12, color: "#8549f6" },
  { prize: "Half Price Round", weight: 25, color: "#4b68ff" },
  { prize: "25% Off", weight: 50, color: "#2c41af" },
  { prize: "10% Off", weight: 150, color: "#2a2f5b" },
  { prize: "Full Price", weight: 243, color: "#333333" }
];
const totalWeight = weightedDistribution.reduce((sum, p) => sum + p.weight, 0);

// Section 2 moved up

// let rainbowAngle = 0; // Declaration moved up

function drawRainbowBorder(ctx, centerX, centerY, radius) {
  const gradient = ctx.createConicGradient(rainbowAngle, centerX, centerY);
  gradient.addColorStop(0, '#ff0000');
  gradient.addColorStop(0.125, '#ff8800');
  gradient.addColorStop(0.25, '#ffff00');
  gradient.addColorStop(0.375, '#00ff00');
  gradient.addColorStop(0.5, '#00ffff');
  gradient.addColorStop(0.625, '#0088ff');
  gradient.addColorStop(0.75, '#8800ff');
  gradient.addColorStop(0.875, '#ff00ff');
  gradient.addColorStop(1, '#ff0000');

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 12, 0, Math.PI * 2); // Adjust radius for border position
  ctx.lineWidth = 8; // Increased thickness from 4
  ctx.strokeStyle = gradient;
  ctx.stroke();
  ctx.restore();
}

function animateRainbow() {
  rainbowAngle += 0.05; // Adjust speed of rainbow cycle
  drawWheel(); // Redraw the wheel which includes the border
  requestAnimationFrame(animateRainbow);
}

function drawWheel() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 15; // Leave space for border etc.
  const sliceAngleRad = (2 * Math.PI) / totalVisualSlices;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const offsetRad = initialOffsetDeg * (Math.PI / 180);

  for (let i = 0; i < totalVisualSlices; i++) {
    const startAngle = i * sliceAngleRad + offsetRad;
    const endAngle = (i + 1) * sliceAngleRad + offsetRad;

    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = visualSegments[i].color;
    ctx.fill();

    // Draw text
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngleRad / 2); // Rotate context to center of slice
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial"; // Adjust font size as needed
    // Adjust text position (radius - distance from edge, vertical offset)
    ctx.fillText(visualSegments[i].prize, radius - 10, 5);
    ctx.restore();
  }

  // Draw the animated rainbow border on top
  drawRainbowBorder(ctx, centerX, centerY, radius + 15); // Use outer radius for border
}

// Start the rainbow animation immediately when the page loads
// animateRainbow(); // Let's disable this for now to focus on spin logic

// ------------------------------------------------------------------
// 4. Spin Logic & State Management (Rewritten)
// ------------------------------------------------------------------

// --- State Variables ---
let currentRotationDeg = 0;    // Current visual rotation in degrees
let targetRotationDeg = 0;     // The final target rotation for the spin
let startRotationDeg = 0;      // Rotation degree at the start of a spin
// let spinStartTime = 0;         // Declared globally
let idleAnimationFrame = null; // requestAnimationFrame ID for idle spin
let spinAnimationFrame = null; // requestAnimationFrame ID for active spin
let isSpinning = false;        // True during the main spin animation + freeze time
let isIdle = true;             // True when the wheel is doing its slow idle spin
// let lastTickTime = 0;          // No longer needed
// let rotationSinceLastTick = 0; // Replaced by new tick logic
// let lastFrameRotationDeg = 0;  // Replaced by new tick logic
let ticksPlayed = 0;           // Counter for angle-based ticks
let nextTickTargetRotation = 0;// Target rotation for the next tick

// --- Constants ---
const IDLE_ROTATION_SPEED = 0.05; // Degrees per frame for slow idle spin (adjust for desired speed)
const TICK_ANGLE_THRESHOLD = 360; // Play tick sound every X degrees - Tuned (was 8, segment is 11.25)
const SPIN_DURATION_MS = 8000;    // Total duration of the spin animation (ms)
const MIN_FULL_ROTATIONS = 8;     // Minimum full rotations during a spin
const FREEZE_DURATION_MS = 6000;  // How long to freeze on the prize (ms) - Increased from 3000
const POINTER_TARGET_DEG = 270;   // The angle (degrees) where the pointer is (usually 270 for top)

// --- Easing Function (easeOutQuint for dramatic slowdown) ---
function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

// --- Sound Management (Angle-Based Ticks using Pool) ---
function playTickSoundAngleBased(progress) {
  if (tickSounds.length === 0) return; // No sounds in the pool

  const soundToPlay = tickSounds[currentTickSoundIndex];
  let volume = 0.3 + progress * 0.4; // Adjust volume based on progress (0.3 -> 0.7)
  soundToPlay.volume = isMuted ? 0 : Math.min(volume, 1.0); // Apply mute state

  // console.log(`[${performance.now().toFixed(0)}] Attempting to play tick sound #${currentTickSoundIndex+1} (Angle Based). Progress: ${progress.toFixed(2)}`); // Removed log
  soundToPlay.currentTime = 0; // Reset time to start
  soundToPlay.play().catch(e => console.error(`[${performance.now().toFixed(0)}] Error playing tick sound #${currentTickSoundIndex+1}:`, e));

  // Move to the next sound in the pool for the next tick
  currentTickSoundIndex = (currentTickSoundIndex + 1) % tickSounds.length;
}

// --- Idle Rotation ---
function startIdleRotation() {
  if (idleAnimationFrame) {
      console.log("startIdleRotation called but idleAnimationFrame already exists. Cancelling old frame.");
      cancelAnimationFrame(idleAnimationFrame);
  }
  isIdle = true;
  isSpinning = false; // Ensure spin state is false
  console.log(`[${performance.now().toFixed(0)}] Starting idle rotation. isIdle: ${isIdle}, isSpinning: ${isSpinning}`);

  function idleLoop() {
    if (!isIdle) {
      console.log(`[${performance.now().toFixed(0)}] Stopping idle loop because isIdle is false.`);
      cancelAnimationFrame(idleAnimationFrame);
      idleAnimationFrame = null;
      return; // Stop if no longer idle
    }
    currentRotationDeg = (currentRotationDeg + IDLE_ROTATION_SPEED) % 360;
    canvas.style.transform = `rotate(${currentRotationDeg}deg)`;
    // console.log(`[${performance.now().toFixed(0)}] Idle loop tick. Rotation: ${currentRotationDeg.toFixed(2)}`); // Optional: very verbose
    idleAnimationFrame = requestAnimationFrame(idleLoop);
  }
  // Ensure canvas style is set before starting loop if it wasn't already
  console.log(`[${performance.now().toFixed(0)}] Setting initial idle transform: rotate(${currentRotationDeg}deg)`);
  canvas.style.transform = `rotate(${currentRotationDeg}deg)`;
  idleLoop();
}

function stopIdleRotation() {
  console.log(`[${performance.now().toFixed(0)}] Stopping idle rotation. Current frame: ${idleAnimationFrame}`);
  isIdle = false; // Set state FIRST
  if (idleAnimationFrame) {
    cancelAnimationFrame(idleAnimationFrame);
    idleAnimationFrame = null;
    console.log(`[${performance.now().toFixed(0)}] Cancelled idle frame.`);
  } else {
    console.log(`[${performance.now().toFixed(0)}] No idle frame to cancel.`);
  }
  // Ensure the final position is set without transition before spin starts
  console.log(`[${performance.now().toFixed(0)}] Setting final transform before spin: rotate(${currentRotationDeg}deg)`);
  canvas.style.transition = 'none';
  canvas.style.transform = `rotate(${currentRotationDeg}deg)`;
  canvas.offsetHeight; // Force browser reflow
}

// --- Prize Selection ---
function selectWeightedPrize() {
  let randomWeight = Math.random() * totalWeight;
  let cumulativeWeight = 0;
  for (const item of weightedDistribution) {
    cumulativeWeight += item.weight;
    if (randomWeight <= cumulativeWeight) {
      return item;
    }
  }
  // Fallback (should not be reached with correct totalWeight)
  console.warn("Fell through weighted selection, returning last item.");
  return weightedDistribution[weightedDistribution.length - 1];
}

// --- Spin Animation ---
function spinWheel() {
  if (isSpinning) {
    console.log(`[${performance.now().toFixed(0)}] Spin attempt rejected: already spinning (isSpinning=${isSpinning}).`);
    return; // Prevent multiple spins
  }
  console.log(`[${performance.now().toFixed(0)}] Starting spinWheel(). isIdle: ${isIdle}, isSpinning: ${isSpinning}`);

  stopIdleRotation(); // This sets isIdle = false
  isSpinning = true; // Set spinning state TRUE immediately after stopping idle
  console.log(`[${performance.now().toFixed(0)}] State after setting isSpinning: isIdle: ${isIdle}, isSpinning: ${isSpinning}`);
  spinButton.disabled = true;
  canvas.classList.add('spinning'); // Optional: for CSS styles

  // 1. Determine Winning Prize & Target Segment
  const winningPrize = selectWeightedPrize();
  console.log("Winning Prize:", winningPrize.prize);
  const possibleTargetIndices = [];
  visualSegments.forEach((segment, index) => {
    if (segment.prize === winningPrize.prize) {
      possibleTargetIndices.push(index);
    }
  });
  const targetIndex = possibleTargetIndices[Math.floor(Math.random() * possibleTargetIndices.length)];
  console.log("Target Visual Index:", targetIndex);

  // 2. Calculate Target Rotation
  const sliceAngleDeg = 360 / totalVisualSlices;
  const targetSliceCenterDeg = (targetIndex + 0.5) * sliceAngleDeg;
  const targetCenterRelative = (targetSliceCenterDeg + initialOffsetDeg + 360) % 360;
  console.log("Target Slice Center Relative Angle:", targetCenterRelative);

  const currentAngleMod = currentRotationDeg % 360;
  let degreesToTarget = (POINTER_TARGET_DEG - targetCenterRelative - currentAngleMod + 360) % 360;
  console.log("Degrees to target (before min rotations):", degreesToTarget);

  const totalRotationAmount = (MIN_FULL_ROTATIONS * 360) + degreesToTarget;
  console.log("Total rotation amount:", totalRotationAmount);

  startRotationDeg = currentRotationDeg;
  targetRotationDeg = startRotationDeg + totalRotationAmount;
  spinStartTime = performance.now();
  // Reset tick counters for the new spin
  ticksPlayed = 0;
  nextTickTargetRotation = TICK_ANGLE_THRESHOLD; // Target for the *first* tick relative to start

  // Play spin start sound (respect mute)
  console.log(`[${performance.now().toFixed(0)}] Attempting to play spin start sound.`);
  spinSound.volume = isMuted ? 0 : initialVolumes.spin;
  spinSound.currentTime = 0;
  spinSound.play().then(() => {
      // console.log(`[${performance.now().toFixed(0)}] Spin sound started.`); // Optional success log
  }).catch(e => console.error(`[${performance.now().toFixed(0)}] Error playing spin sound:`, e));

  // 3. Start Animation Loop
  if (spinAnimationFrame) cancelAnimationFrame(spinAnimationFrame);
  animateSpin();

  function animateSpin() {
    const currentTime = performance.now();
    const elapsed = currentTime - spinStartTime;
    const progress = Math.min(elapsed / SPIN_DURATION_MS, 1); // 0 to 1
    const easedProgress = easeOutQuint(progress);

    // const previousRotation = lastFrameRotationDeg; // No longer needed
    currentRotationDeg = startRotationDeg + (totalRotationAmount * easedProgress);
    canvas.style.transform = `rotate(${currentRotationDeg}deg)`;
    // lastFrameRotationDeg = currentRotationDeg; // No longer needed

    // Calculate total rotation so far in this spin
    const totalRotationSoFar = currentRotationDeg - startRotationDeg;

    // console.log(`[${currentTime.toFixed(0)}] Spin progress: ${progress.toFixed(3)}, Rotation: ${currentRotationDeg.toFixed(2)}, TotalRot: ${totalRotationSoFar.toFixed(2)}, NextTickTarget: ${nextTickTargetRotation.toFixed(2)}`); // Verbose logging removed

    // Check if the total rotation has passed the next tick target(s) using a while loop
    while (totalRotationSoFar >= nextTickTargetRotation) { // Use while instead of if
        console.log(`[${currentTime.toFixed(0)}] *** Tick Threshold Met! TotalRot: ${totalRotationSoFar.toFixed(2)} >= Target: ${nextTickTargetRotation.toFixed(2)} ***`);
        playTickSoundAngleBased(progress);
        ticksPlayed++;
        nextTickTargetRotation = (ticksPlayed + 1) * TICK_ANGLE_THRESHOLD; // Set target for the next tick
        // console.log(`[${currentTime.toFixed(0)}] Tick Played. New Target: ${nextTickTargetRotation.toFixed(2)}`);
    }


    if (progress < 1) {
      spinAnimationFrame = requestAnimationFrame(animateSpin);
    } else {
      // --- SPIN FINISHED ---
      console.log(`[${currentTime.toFixed(0)}] Spin animation finished. Snapping to final rotation: ${targetRotationDeg}`);
      currentRotationDeg = targetRotationDeg; // Snap to exact final position
      canvas.style.transform = `rotate(${currentRotationDeg}deg)`;
      spinAnimationFrame = null;

      // Stop all tick sounds (if playing), play win sound
      tickSounds.forEach(sound => {
          sound.pause();
          sound.currentTime = 0;
      });
      console.log(`[${currentTime.toFixed(0)}] Attempting to play win sound.`);
      winSound.volume = isMuted ? 0 : initialVolumes.win; // Respect mute
      winSound.currentTime = 0;
      winSound.play().then(() => {
         // console.log(`[${currentTime.toFixed(0)}] Win sound started.`); // Optional success log
      }).catch(e => console.error(`[${currentTime.toFixed(0)}] Error playing win sound:`, e));

      // Show prize modal immediately
      console.log(`[${currentTime.toFixed(0)}] Calling showPrizeModal.`);
      showPrizeModal(winningPrize);

      // Freeze for duration, then resume idle
      console.log(`[${currentTime.toFixed(0)}] Starting freeze (${FREEZE_DURATION_MS}ms)...`);
      setTimeout(() => {
        console.log(`[${performance.now().toFixed(0)}] Freeze finished. Hiding modal and resuming idle.`);
        hidePrizeModal();
        canvas.classList.remove('spinning');
        spinButton.disabled = false;
        // isSpinning will be set to false inside startIdleRotation, which is called next
        startIdleRotation();
      }, FREEZE_DURATION_MS);
    }
  }
}

// --- Modal Display ---
function showPrizeModal(winningPrize) {
  console.log("Showing prize modal for:", winningPrize.prize);
  const wheelContainer = document.querySelector('.wheel-container');
  const wheelRect = wheelContainer.getBoundingClientRect();
  prizeModal.style.position = 'fixed';
  prizeModal.style.left = `${wheelRect.left + wheelRect.width / 2}px`;
  prizeModal.style.top = `${wheelRect.top + wheelRect.height / 2}px`;
  prizeModal.style.transform = 'translate(-50%, -50%) scale(0.8)'; // Center and prepare

  const isFullPrice = winningPrize.prize === "Full Price";
  const prizeDisplay = isFullPrice ? "Full Price" : winningPrize.prize; // Keep prize name for main text
  const headerText = isFullPrice ? "Unlucky!" : "Congratulations!"; // Conditional header

  // Set header and prize text
  const prizeHeader = prizeModal.querySelector('.prize-header');
  if (prizeHeader) {
      prizeHeader.textContent = headerText;
      prizeHeader.style.display = 'block'; // Ensure header is always visible
  }
  prizeText.textContent = prizeDisplay; // Display the actual prize name

  const isMajor = MAJOR_PRIZES.includes(winningPrize.prize);
  prizeModal.dataset.prizeType = isMajor ? "major" : "minor";
  prizeModal.style.setProperty('--prize-color', winningPrize.color);
  prizeModal.style.backgroundColor = `${winningPrize.color}22`; // Semi-transparent background
  prizeModal.style.borderColor = winningPrize.color;
  prizeText.style.color = winningPrize.color === "#e5cb5d" ? "#000" : "#fff"; // Black text for gold

  prizeModal.style.display = "block";
  prizeModal.style.opacity = 0; // Start transparent for fade-in
  prizeModal.style.animation = 'modalFadeInScale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

  // Particle explosions
  const particlesContainer = prizeModal.querySelector('.prize-particles');
  if (particlesContainer) {
      particlesContainer.innerHTML = ''; // Clear old particles
      // Always explode unless it's "Full Price"
      if (!isFullPrice) {
          console.log(`[${performance.now().toFixed(0)}] Triggering particle explosion (standard).`);
          animateParticles(particlesContainer, winningPrize.color);

          // Add extra bursts for major prizes
          if (isMajor) {
              console.log(`[${performance.now().toFixed(0)}] Triggering extra particle explosions (major prize).`);
              setTimeout(() => animateParticles(particlesContainer, winningPrize.color), 200); // Staggered burst 1
              setTimeout(() => animateParticles(particlesContainer, winningPrize.color), 400); // Staggered burst 2
          }
      }
  } else {
      console.error("Particles container not found in modal.");
  }


  saveRecentWin(winningPrize.prize, winningPrize.color);
}

function hidePrizeModal() {
  console.log("Hiding prize modal.");
  prizeModal.style.animation = 'modalFadeOut 0.5s ease-out forwards';
  // Add a timeout to set display none *after* the fade-out animation completes
  setTimeout(() => {
      prizeModal.style.display = "none";
      prizeModal.style.animation = ''; // Reset animation property
  }, 500); // Match animation duration
}


// --- Mute Button Logic ---
function toggleMute() {
    isMuted = !isMuted;
    console.log(`[${performance.now().toFixed(0)}] Mute toggled. isMuted: ${isMuted}`);

    // Mute/unmute all sounds immediately
    spinSound.volume = isMuted ? 0 : initialVolumes.spin;
    winSound.volume = isMuted ? 0 : initialVolumes.win;
    // Tick sound volume is set dynamically, but we can mute/unmute the elements
    tickSounds.forEach(sound => sound.muted = isMuted); // Use the 'muted' property for ticks

    // Update button appearance (show/hide icons via class)
    // muteButton.textContent = isMuted ? "Unmute" : "Mute"; // Replaced by icon toggle
    muteButton.classList.toggle('muted', isMuted);
}

// --- Event Listeners ---
spinButton.addEventListener("click", function(e) {
  e.stopPropagation(); // Prevent the document click from also triggering
  spinWheel();
}); 
muteButton.addEventListener("click", function(e) {
  e.stopPropagation(); // Prevent the document click from also triggering
  toggleMute();
}); 

// Add click event for the entire document to spin the wheel
document.addEventListener("click", function(e) {
  // Don't spin if we're already spinning or if clicking on modal or mute button
  if (isSpinning || spinButton.disabled) return;
  
  // Don't spin if clicking on the prize modal
  if (prizeModal.style.display === "block" && prizeModal.contains(e.target)) return;
  
  // Don't spin if clicking on recent wins section
  const recentWinsSection = document.querySelector('.recent-wins');
  if (recentWinsSection && recentWinsSection.contains(e.target)) return;
  
  spinWheel();
});

// Prevent Enter key from activating mute button when focused
muteButton.addEventListener("keydown", function(e) {
    if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault(); // Stop the default 'click' trigger on Enter
    }
});


document.addEventListener("keydown", function(e) {
  if ((e.code === "Space" || e.code === "NumpadEnter") && !spinButton.disabled) {
    e.preventDefault(); // Prevent default page scroll on Space
    spinWheel();
  }
});

// --- Initialisation ---
console.log("Initialising script...");
drawWheel(); // Initial draw
animateRainbow(); // Re-enable rainbow animation - this continuously calls drawWheel()
startIdleRotation(); // Start the wheel's idle rotation on load
