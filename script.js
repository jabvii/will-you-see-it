/* Trap Adventure — Static Platformer (Fixed version)
   - All traps, death video, and fake CMD joke on finish.
   - Now the fake CMD window is dynamically generated so it always shows up.
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const deathVideo = document.getElementById("deathVideo");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = 520;

let keys = {};
let gameOver = false;
let allowInput = true;
let attempts = 0;

// Player
const player = {
  x: 40,
  y: GROUND_Y - 40,
  width: 36,
  height: 36,
  color: "#4A90E2",
  velX: 0,
  velY: 0,
  speed: 5.4,
  jumpStrength: -12.5,
  onGround: false,
  groundedPlatform: null,
};

const gravity = 0.6;
const friction = 0.85;

// Platforms
const platforms = [
  { x: 0, y: GROUND_Y, w: WIDTH, h: HEIGHT - GROUND_Y, type: "ground" },
  { x: 140, y: 440, w: 140, h: 16, type: "solid" },
  { x: 320, y: 380, w: 120, h: 16, type: "solid" },
  { x: 480, y: 320, w: 100, h: 16, type: "solid" },
  { x: 620, y: 320, w: 100, h: 16, type: "collapsing", collapsed: false, collapseTimer: 0 },
  { x: 760, y: 360, w: 120, h: 16, type: "solid" },
  { x: 920, y: 360, w: 120, h: 16, type: "fake", dropped: false, dropTimer: 0 },
  { x: 1160, y: 300, w: 140, h: 16, type: "solid" },
  { x: 1340, y: 260, w: 110, h: 16, type: "solid" },
  { x: 1500, y: 320, w: 160, h: 16, type: "solid" },
  { x: 1720, y: 360, w: 140, h: 16, type: "collapsing", collapsed: false, collapseTimer: 0 },
  { x: 1900, y: 360, w: 120, h: 16, type: "fake", dropped: false, dropTimer: 0 },
  { x: 2140, y: 260, w: 180, h: 16, type: "solid" },
  { x: 2360, y: 220, w: 160, h: 16, type: "solid" },
  { x: 2560, y: 300, w: 220, h: 16, type: "solid" },
  { x: 2820, y: 360, w: 110, h: 16, type: "solid" },
  { x: 2950, y: 360, w: 110, h: 16, type: "solid" },
  { x: 3180, y: 320, w: 140, h: 16, type: "solid" },
  { x: 3360, y: 360, w: 120, h: 16, type: "solid" },
  { x: 3550, y: 300, w: 120, h: 16, type: "solid" },
];

// Hidden spikes
const hiddenSpikes = [
  { x: 960, y: GROUND_Y, w: 120, h: 18, triggered: false, triggerZone: { x: 920, w: 120 } },
  { x: 1860, y: GROUND_Y, w: 120, h: 18, triggered: false, triggerZone: { x: 1900, w: 120 } },
  { x: 3000, y: GROUND_Y, w: 120, h: 18, triggered: false, triggerZone: { x: 2940, w: 120 } },
];
const spikeTriggers = hiddenSpikes.map(s => ({ x: s.triggerZone.x, w: s.triggerZone.w, fired: false }));

// Finish line
const finish = { x: 3720, y: 200, w: 12, h: 320 };
const LOGICAL_WIDTH = 3800;
const SCALE = WIDTH / LOGICAL_WIDTH;

function worldToScreen(x) { return x * SCALE; }
function worldW(w) { return w * SCALE; }

function resetPlayer() {
  player.x = 40;
  player.y = GROUND_Y - player.height;
  player.velX = 0;
  player.velY = 0;
  player.onGround = false;
  player.groundedPlatform = null;
}

// Input
document.addEventListener("keydown", e => { if (allowInput) keys[e.code] = true; });
document.addEventListener("keyup", e => { keys[e.code] = false; });

let lastTime = performance.now();
function loop(now) {
  const dt = now - lastTime;
  lastTime = now;
  update(dt);
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  if (gameOver) return;

  // Movement
  if (keys["ArrowRight"] || keys["KeyD"]) player.velX = player.speed;
  else if (keys["ArrowLeft"] || keys["KeyA"]) player.velX = -player.speed;
  else {
    player.velX *= friction;
    if (Math.abs(player.velX) < 0.08) player.velX = 0;
  }

  if ((keys["Space"] || keys["ArrowUp"]) && player.onGround) {
    player.velY = player.jumpStrength;
    player.onGround = false;
    player.groundedPlatform = null;
  }

  // Gravity
  player.velY += gravity;
  player.x += player.velX;
  player.y += player.velY;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > LOGICAL_WIDTH) player.x = LOGICAL_WIDTH - player.width;

  // Collision with platforms
  let onAnyPlatform = false;
  for (let p of platforms) {
    if (player.x + player.width > p.x && player.x < p.x + p.w) {
      const prevBottom = player.y - player.velY + player.height;
      if (player.y + player.height > p.y && prevBottom <= p.y) {
        player.y = p.y - player.height;
        player.velY = 0;
        player.onGround = true;
        player.groundedPlatform = p;
        onAnyPlatform = true;
        if (p.type === "collapsing" && !p.collapsed && p.collapseTimer === 0) p.collapseTimer = 600;
        if (p.type === "fake" && !p.dropped && p.dropTimer === 0) p.dropTimer = 500;
      }
    }
  }
  if (!onAnyPlatform) {
    player.onGround = false;
    player.groundedPlatform = null;
  }

  // Update timers
  for (let p of platforms) {
    if (p.type === "collapsing" && p.collapseTimer > 0 && !p.collapsed) {
      p.collapseTimer -= dt;
      if (p.collapseTimer <= 0) p.collapsed = true;
    }
    if (p.type === "fake" && p.dropTimer > 0 && !p.dropped) {
      p.dropTimer -= dt;
      if (p.dropTimer <= 0) p.dropped = true;
    }
  }

  // Check spikes
  for (let i = 0; i < spikeTriggers.length; i++) {
    if (!spikeTriggers[i].fired &&
        player.x + player.width / 2 > spikeTriggers[i].x &&
        player.x + player.width / 2 < spikeTriggers[i].x + spikeTriggers[i].w) {
      spikeTriggers[i].fired = true;
      hiddenSpikes[i].triggered = true;
    }
  }

  for (let s of hiddenSpikes) {
    if (s.triggered &&
        player.x + player.width > s.x &&
        player.x < s.x + s.w &&
        player.y + player.height > s.y - s.h) {
      die();
      return;
    }
  }

  // Finish line check
  if (player.x + player.width > finish.x && player.x < finish.x + finish.w && player.y + player.height > finish.y) {
    win();
  }

  // Fall death
  if (player.y > HEIGHT + 200) die();
}

function draw() {
  ctx.fillStyle = "#1f1f1f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, "#232323");
  grad.addColorStop(1, "#1f1f1f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw platforms
  for (let p of platforms) {
    const sx = worldToScreen(p.x);
    const sy = p.y;
    const sw = worldW(p.w);
    const sh = p.h;
    if (p.type === "ground") ctx.fillStyle = "#4a4a4a";
    else if (p.type === "solid") ctx.fillStyle = "#8b8b8b";
    else if (p.type === "collapsing" && !p.collapsed) ctx.fillStyle = "#b5654a";
    else if (p.type === "fake" && !p.dropped) ctx.fillStyle = "#9aa3ad";
    else continue;
    ctx.fillRect(sx, sy, sw, sh);
  }

  // Draw spikes
  for (let s of hiddenSpikes) {
    if (s.triggered) drawSpikes(worldToScreen(s.x), s.y, worldW(s.w), s.h);
  }

  // Finish line
  const fx = worldToScreen(finish.x);
  ctx.fillStyle = "#6be26b";
  ctx.fillRect(fx, finish.y, worldW(finish.w), finish.h);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Arial";
  ctx.fillText("FINISH", fx - 60, finish.y - 12);

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(worldToScreen(player.x), player.y, player.width, player.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText("Attempts: " + attempts, 18, 28);
  ctx.font = "14px Arial";
  ctx.fillText("Use A/D or ← → to move. Space to jump. Reach the FINISH.", 18, 50);
}

function drawSpikes(x, groundY, width, height) {
  ctx.fillStyle = "#c62828";
  const spikeCount = Math.max(3, Math.floor(width / 20));
  const step = width / spikeCount;
  for (let i = 0; i < spikeCount; i++) {
    const sx = x + i * step;
    ctx.beginPath();
    ctx.moveTo(sx, groundY);
    ctx.lineTo(sx + step / 2, groundY - height);
    ctx.lineTo(sx + step, groundY);
    ctx.closePath();
    ctx.fill();
  }
}

function die() {
  if (gameOver) return;
  gameOver = true;
  allowInput = false;
  attempts += 1;
  flashScreen();
  setTimeout(() => {
    canvas.style.display = "none";
    deathVideo.style.display = "block";
    deathVideo.currentTime = 0;
    deathVideo.play();
    deathVideo.onended = () => document.addEventListener("keydown", restartHandler);
  }, 500);
}

function flashScreen() {
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function win() {
  if (gameOver) return;
  gameOver = true;
  allowInput = false;

  // Fill screen to make it obvious
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("You reached the finish line!", 400, 300);

  // Show CMD effect after a short delay
  setTimeout(() => {
    console.log("WIN triggered — showing fake CMD overlay."); // debug log
    showFakeCmdDynamic();
  }, 1000);
}

function showFakeCmdDynamic() {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "fakeCmdOverlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "#000",
    color: "#00ff00",
    fontFamily: "Courier New, monospace",
    padding: "20px",
    whiteSpace: "pre-wrap",
    overflowY: "auto",
    zIndex: "999999",
  });

  // ✅ Allow keyboard input even while overlay is visible
  overlay.style.pointerEvents = "none";

  document.body.appendChild(overlay);

  const lines = [
    "C:\\Windows\\System32> del *.* /s /q",
    "Deleting system files...",
    "[WARNING] Unauthorized operation detected.",
    "[INFO] Attempting recovery...",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Windows defender is failing.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[INFO] Attempting recovery...",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "[ERROR] Access denied.",
    "",
    "System malfunction imminent...",
  ];

  let i = 0;
  function typeLine() {
    if (i < lines.length) {
      overlay.textContent += lines[i] + "\n";
      i++;
      setTimeout(typeLine, 400);
    } else {
      setTimeout(() => {
        overlay.textContent += "\nJust kidding 😜 You survived the traps!\n\nPress R to restart.";
        document.addEventListener("keydown", restartHandler);
      }, 1000);
    }
  }

  // Force visible right away
  overlay.textContent = "Loading CMD...\n\n";
  typeLine();
}

function restartHandler(e) {
  if (e.code === "KeyR") {
    // Remove the fake CMD overlay if it exists
    const overlay = document.getElementById("fakeCmdOverlay");
    if (overlay) overlay.remove();

    // Reset game state
    gameOver = false;
    allowInput = true;
    resetPlatforms();
    resetPlayer();

    // Hide video (if any)
    deathVideo.pause();
    deathVideo.style.display = "none";
    canvas.style.display = "block";

    // Remove the key listener to avoid duplicates
    document.removeEventListener("keydown", restartHandler);

    // Restart the main loop
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function resetPlatforms() {
  for (let p of platforms) {
    if (p.type === "collapsing") { p.collapsed = false; p.collapseTimer = 0; }
    if (p.type === "fake") { p.dropped = false; p.dropTimer = 0; }
  }
  for (let s of hiddenSpikes) s.triggered = false;
  for (let t of spikeTriggers) t.fired = false;
}

resetPlayer();
resetPlatforms();