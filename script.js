const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const prizeModal = document.getElementById("prizeModal");
const prizeText = document.getElementById("prizeText");

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

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

// ------------------------------------------------------------------
// 2. Visual Distribution (32 equal slices)
// ------------------------------------------------------------------
const totalVisualSlices = 32;
const visualSegments = new Array(totalVisualSlices);

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

// Leftover indices among remaining:
const leftover = remainingIndices.filter(idx => !freeRoundNeighbors.has(idx));
leftover.sort((a, b) => a - b);
// Assign the leftover positions as Free Shot.
for (let idx of leftover) {
  visualSegments[idx] = { prize: "10% Off", color: "#2a2f5b" };
}

const initialOffsetDeg = -90;
function drawWheel() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY);
  const sliceAngle = (2 * Math.PI) / totalVisualSlices;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const offsetRad = initialOffsetDeg * (Math.PI / 180);
  for (let i = 0; i < totalVisualSlices; i++) {
    const startAngle = i * sliceAngle + offsetRad;
    const endAngle = (i + 1) * sliceAngle + offsetRad;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = visualSegments[i].color;
    ctx.fill();
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(visualSegments[i].prize, radius - 24, 5);
    ctx.restore();
  }
  
  const borderWidth = 16;
  const grad = ctx.createRadialGradient(centerX, centerY, radius - borderWidth, centerX, centerY, radius);
  grad.addColorStop(0, "#000");
  grad.addColorStop(1, "#666");
  ctx.strokeStyle = grad;
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - borderWidth / 2, 0, 2 * Math.PI);
  ctx.stroke();
}
drawWheel();

// ------------------------------------------------------------------
// 4. Spin Logic & Weighted Selection (with custom easing)
// ------------------------------------------------------------------
let currentRotationDeg = 0; // in degrees
function selectWeightedPrize() {
  let rnd = Math.random() * totalWeight;
  let cumulative = 0;
  for (let item of weightedDistribution) {
    cumulative += item.weight;
    if (rnd < cumulative) {
      return item;
    }
  }
  return weightedDistribution[weightedDistribution.length - 1];
}
spinButton.addEventListener("click", () => {
  spinButton.disabled = true;
  
  const winningPrizeObj = selectWeightedPrize();
  
  const candidateIndices = [];
  visualSegments.forEach((segment, i) => {
    if (segment.prize === winningPrizeObj.prize) {
      candidateIndices.push(i);
    }
  });
  
  const targetIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
  
  const sliceAngleDeg = 360 / totalVisualSlices;
  const targetSliceCenter = ((targetIndex + 0.5) * sliceAngleDeg + initialOffsetDeg + 360) % 360;
  
  // We want the winning slice's center to be at 0° (the top).
  let additionalRotation = (270 - ((currentRotationDeg + targetSliceCenter) % 360)) % 360;
  const extraSpins = 5; // Extra full rotations.
  const finalRotationDeg = currentRotationDeg + additionalRotation + extraSpins * 360;
  
  canvas.style.transition = "transform 5s cubic-bezier(0.05, 1, 0.5, 1)";
  canvas.style.transform = `rotate(${finalRotationDeg}deg)`;
  currentRotationDeg = finalRotationDeg;
  
  setTimeout(() => {
    prizeText.textContent = winningPrizeObj.prize === "Full Price" ? "Full Price" : winningPrizeObj.prize;
    prizeModal.style.backgroundColor = winningPrizeObj.color;
    prizeText.style.color = winningPrizeObj.prize === "£100 Bar Tab" ? "#000" : "#fff";
    prizeModal.style.display = "block";
    spinButton.disabled = false;
    setTimeout(() => {
      prizeModal.style.display = "none";
    }, 3000);
  }, 5200);
});

document.addEventListener("keydown", function(e) {
  console.log("Key pressed:", e.key, "Code:", e.code);
});

document.addEventListener("keydown", function(e) {
  if ((e.code === "Space" || e.code === "NumpadEnter") && !spinButton.disabled) {
    spinButton.click();
  }
});

document.addEventListener("click", function() {
  if (!spinButton.disabled) {
    spinButton.click();
  }
});

