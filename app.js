const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");
const wheelPointer = document.getElementById("wheelPointer");

const spinButton = document.getElementById("spinButton");
const loadEntriesButton = document.getElementById("loadEntriesButton");
const sampleButton = document.getElementById("sampleButton");
const shuffleButton = document.getElementById("shuffleButton");
const removeWinnerToggle = document.getElementById("removeWinnerToggle");
const clearResultsButton = document.getElementById("clearResultsButton");
const modeToggleButton = document.getElementById("modeToggleButton");
const dedupeButton = document.getElementById("dedupeButton");
const exportButton = document.getElementById("exportButton");
const importFileInput = document.getElementById("importFileInput");

const entriesInput = document.getElementById("entriesInput");
const lastWinner = document.getElementById("lastWinner");
const winnerHistory = document.getElementById("winnerHistory");
const entryCount = document.getElementById("entryCount");
const spinCount = document.getElementById("spinCount");
const entryStat = document.getElementById("entryStat");
const spinStat = document.getElementById("spinStat");
const winnerModal = document.getElementById("winnerModal");
const winnerModalChip = document.getElementById("winnerModalChip");
const winnerModalTitle = document.getElementById("winnerModalTitle");
const winnerModalName = document.getElementById("winnerModalName");
const winnerModalClose = document.getElementById("winnerModalClose");
const winnerRemoveButton = document.getElementById("winnerRemoveButton");
const historyModal = document.getElementById("historyModal");
const historyModalOpenButton = document.getElementById("historyModalOpenButton");
const historyModalTitle = document.getElementById("historyModalTitle");
const historyModalClose = document.getElementById("historyModalClose");
const winnerHistoryModal = document.getElementById("winnerHistoryModal");
const manualWinnerAddButton = document.getElementById("manualWinnerAddButton");
const sideHistoryTitle = document.getElementById("sideHistoryTitle");

const COLORS = [
  "#ff595e",
  "#ffca3a",
  "#8ac926",
  "#1982c4",
  "#6a4c93",
  "#00b4d8",
  "#f15bb5",
  "#ff924c",
  "#2ec4b6",
  "#4361ee",
];

const WHEEL_SIZE = 1024;
const FX_PARTICLE_COUNT = 560;

const state = {
  entries: [],
  spinTotal: 0,
  spinning: false,
  currentRotationDeg: 0,
  autoRemoveWinner: true,
  pendingWinnerIndex: -1,
  wheelImage: null,
  pointerSegmentIndex: -1,
  lastPointerTickTs: 0,
  lastWinnerIndex: -1,
  confettiRafId: 0,
  confettiParticles: [],
  confettiWaveTimers: [],
  audioCtx: null,
  audioMaster: null,
  historyEntries: [],
  mode: "undian",
};

function normalizeEntries(rawText) {
  return rawText
    .split(/\r?\n|,/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 10000);
}

function entriesToText() {
  entriesInput.value = state.entries.join("\n");
}

function updateStats() {
  entryCount.textContent = state.entries.length.toLocaleString("id-ID");
  spinCount.textContent = state.spinTotal.toLocaleString("id-ID");
}

function setDefaultSample() {
  entriesInput.value = [
    "Ali",
    "Beatriz",
    "Charles",
    "Diya",
    "Eric",
    "Fatima",
    "Gabriel",
    "Hanna",
    "Irfan",
    "Juno",
    "Karin",
    "Lestari",
  ].join("\n");
}

function shuffleEntries() {
  for (let i = state.entries.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.entries[i], state.entries[j]] = [state.entries[j], state.entries[i]];
  }
}

function makeHiDPICanvas(targetCanvas, cssSize) {
  const dpr = window.devicePixelRatio || 1;
  targetCanvas.width = Math.round(cssSize * dpr);
  targetCanvas.height = Math.round(cssSize * dpr);
  targetCanvas.style.width = `${cssSize}px`;
  targetCanvas.style.height = `${cssSize}px`;
  return dpr;
}

function drawHub(drawCtx, radius) {
  drawCtx.beginPath();
  drawCtx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  drawCtx.fillStyle = "#ecf8ff";
  drawCtx.fill();

  drawCtx.beginPath();
  drawCtx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
  drawCtx.fillStyle = "#1e293b";
  drawCtx.fill();
}

function buildWheelImage() {
  const offscreen = document.createElement("canvas");
  offscreen.width = WHEEL_SIZE;
  offscreen.height = WHEEL_SIZE;
  const drawCtx = offscreen.getContext("2d");

  const size = WHEEL_SIZE;
  const radius = size / 2;
  const total = state.entries.length;

  drawCtx.clearRect(0, 0, size, size);
  drawCtx.save();
  drawCtx.translate(radius, radius);

  if (!total) {
    drawCtx.beginPath();
    drawCtx.arc(0, 0, radius - 12, 0, Math.PI * 2);
    const emptyGrad = drawCtx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
    emptyGrad.addColorStop(0, "#31415f");
    emptyGrad.addColorStop(1, "#0b1428");
    drawCtx.fillStyle = emptyGrad;
    drawCtx.fill();

    drawCtx.fillStyle = "#b7c9e8";
    drawCtx.font = '700 48px "Sora", sans-serif';
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.fillText("Tambahkan nama", 0, -8);
    drawCtx.font = '500 30px "Outfit", sans-serif';
    drawCtx.fillText("lalu tekan Muat ke wheel", 0, 52);

    drawHub(drawCtx, radius);
    drawCtx.restore();
    state.wheelImage = offscreen;
    renderWheel();
    return;
  }

  const anglePer = (Math.PI * 2) / total;

  for (let index = 0; index < total; index += 1) {
    const startAngle = index * anglePer;
    const endAngle = startAngle + anglePer;

    drawCtx.beginPath();
    drawCtx.moveTo(0, 0);
    drawCtx.arc(0, 0, radius - 8, startAngle, endAngle);
    drawCtx.closePath();
    drawCtx.fillStyle = COLORS[index % COLORS.length];
    drawCtx.fill();

    const mid = startAngle + anglePer / 2;
    drawCtx.save();
    drawCtx.rotate(mid);
    drawCtx.translate(radius * 0.94, 0);

    const px = Math.max(9, Math.min(30, 2100 / total));
    drawCtx.fillStyle = "#ffffff";
    drawCtx.font = `600 ${px}px \"Outfit\", sans-serif`;
    drawCtx.textAlign = "right";
    drawCtx.textBaseline = "middle";

    const maxChars = Math.max(5, Math.floor(radius / 16));
    const source = state.entries[index];
    const label = source.length > maxChars ? `${source.slice(0, maxChars - 1)}...` : source;
    drawCtx.fillText(label, 0, 0, radius * 0.64);
    drawCtx.restore();
  }

  drawCtx.beginPath();
  drawCtx.arc(0, 0, radius - 8, 0, Math.PI * 2);
  drawCtx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  drawCtx.lineWidth = 5;
  drawCtx.stroke();

  drawHub(drawCtx, radius);
  drawCtx.restore();

  state.wheelImage = offscreen;
  renderWheel();
}

function renderWheel() {
  const cssSize = Math.min(window.innerWidth * 0.86, 700);
  const dpr = makeHiDPICanvas(canvas, cssSize);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssSize, cssSize);

  if (!state.wheelImage) {
    return;
  }

  ctx.drawImage(state.wheelImage, 0, 0, cssSize, cssSize);
}

function resizeConfettiCanvas() {
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = Math.round(window.innerWidth * dpr);
  confettiCanvas.height = Math.round(window.innerHeight * dpr);
  confettiCanvas.style.width = `${window.innerWidth}px`;
  confettiCanvas.style.height = `${window.innerHeight}px`;
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getWheelCenterOnScreen() {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function loadEntries() {
  const parsed = normalizeEntries(entriesInput.value);
  state.entries = parsed;
  state.currentRotationDeg = 0;
  state.lastWinnerIndex = -1;
  canvas.style.transform = "rotate(0deg)";

  updateStats();
  buildWheelImage();

  if (!parsed.length) {
    lastWinner.textContent = "-";
  }
}

function renderWinnerHistory() {
  winnerHistory.innerHTML = "";
  winnerHistoryModal.innerHTML = "";

  state.historyEntries.forEach((entry) => {
    const liPanel = document.createElement("li");
    liPanel.textContent = entry.name;
    if (entry.manual) {
      liPanel.classList.add("manual");
    }
    winnerHistory.append(liPanel);

    const liModal = document.createElement("li");
    liModal.dataset.index = String(winnerHistoryModal.children.length);
    const nameSpan = document.createElement("span");
    nameSpan.className = "history-item-name";
    nameSpan.textContent = liPanel.textContent;
    liModal.append(nameSpan);
    if (entry.manual) {
      liModal.classList.add("manual");
    }
    winnerHistoryModal.append(liModal);
  });

  winnerHistory.scrollTop = winnerHistory.scrollHeight;
  winnerHistoryModal.scrollTop = winnerHistoryModal.scrollHeight;
}

function addHistoryEntry(name, manual = false) {
  state.historyEntries.push({ name, manual });
  if (state.historyEntries.length > 50) {
    state.historyEntries.shift();
  }
  renderWinnerHistory();
}

function flashWinner(name) {
  lastWinner.textContent = name;
  lastWinner.classList.remove("result-flash");
  void lastWinner.offsetWidth;
  lastWinner.classList.add("result-flash");
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!state.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new Ctx();
    state.audioMaster = state.audioCtx.createGain();
    state.audioMaster.gain.value = 0.18;
    state.audioMaster.connect(state.audioCtx.destination);
  }

  if (state.audioCtx.state === "suspended") {
    state.audioCtx.resume();
  }

  return state.audioCtx;
}

function playTickSound(deltaMs = 70) {
  const ctx = ensureAudioContext();
  if (!ctx || !state.audioMaster) {
    return;
  }

  const now = ctx.currentTime;
  const normalized = Math.max(0, Math.min(1, (deltaMs - 20) / 240));
  const freq = 1800 - normalized * 1200;
  const duration = 0.008 + normalized * 0.03;
  const gainValue = 0.03 + (1 - normalized) * 0.035;

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(state.audioMaster);
  osc.start(now);
  osc.stop(now + duration + 0.005);
}

function playWinnerSound() {
  const ctx = ensureAudioContext();
  if (!ctx || !state.audioMaster) {
    return;
  }

  const now = ctx.currentTime;
  const notes = [880, 1174, 1568];
  notes.forEach((freq, idx) => {
    const start = now + idx * 0.1;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    osc.connect(gain);
    gain.connect(state.audioMaster);
    osc.start(start);
    osc.stop(start + 0.24);
  });
}

function syncAutoRemoveUI() {
  removeWinnerToggle.setAttribute("aria-pressed", String(state.autoRemoveWinner));
  const target = state.mode === "saksi" ? "saksi" : "pemenang";
  removeWinnerToggle.textContent = `Auto remove ${target}: ${state.autoRemoveWinner ? "ON" : "OFF"}`;
  winnerRemoveButton.hidden = state.autoRemoveWinner;
  winnerRemoveButton.textContent = state.mode === "saksi" ? "Remove saksi" : "Remove pemenang";
}

function syncModeUI() {
  const isSaksi = state.mode === "saksi";
  modeToggleButton.textContent = `Mode: ${isSaksi ? "Saksi" : "Undian"}`;
  historyModalOpenButton.textContent = isSaksi ? "Daftar Saksi" : "Daftar pemenang";
  historyModalTitle.textContent = isSaksi ? "Daftar saksi" : "Daftar pemenang";
  sideHistoryTitle.textContent = isSaksi ? "Daftar saksi" : "Daftar pemenang";
  manualWinnerAddButton.hidden = isSaksi;
  entryStat.hidden = isSaksi;
  spinStat.hidden = isSaksi;

  if (!isSaksi) {
    winnerModalChip.hidden = false;
    winnerModalTitle.textContent = "Selamat!";
  }

  syncAutoRemoveUI();
}

function triggerPointerTick(deltaMs = 70) {
  wheelPointer.classList.remove("ticking");
  void wheelPointer.offsetWidth;
  wheelPointer.classList.add("ticking");
  playTickSound(deltaMs);
}

function getPointerSegmentIndex(rotationDeg) {
  const total = state.entries.length;
  if (!total) {
    return -1;
  }

  const anglePer = 360 / total;
  const normalized = ((rotationDeg % 360) + 360) % 360;
  const effective = ((0 - normalized) + 360) % 360;
  return Math.floor(effective / anglePer) % total;
}

function updatePointerTickByRotation(rotationDeg) {
  const segment = getPointerSegmentIndex(rotationDeg);
  if (segment < 0) {
    return;
  }

  if (state.pointerSegmentIndex < 0) {
    state.pointerSegmentIndex = segment;
    state.lastPointerTickTs = performance.now();
    return;
  }

  if (segment !== state.pointerSegmentIndex) {
    const now = performance.now();
    const deltaMs = state.lastPointerTickTs > 0 ? now - state.lastPointerTickTs : 70;
    triggerPointerTick(deltaMs);
    state.lastPointerTickTs = now;
    state.pointerSegmentIndex = segment;
  }
}

function openWinnerModal(name, orderNumber = 1) {
  winnerModalName.textContent = name;
  if (state.mode === "saksi") {
    winnerModalChip.hidden = true;
    winnerModalTitle.textContent = `Saksi ${orderNumber}`;
  } else {
    winnerModalChip.hidden = false;
    winnerModalTitle.textContent = "Selamat!";
  }
  winnerRemoveButton.hidden = state.autoRemoveWinner;
  winnerModal.classList.add("open");
  winnerModal.setAttribute("aria-hidden", "false");
  playWinnerSound();
  startConfettiLoop();
}

function openHistoryModal() {
  historyModal.classList.add("open");
  historyModal.setAttribute("aria-hidden", "false");
}

function closeHistoryModal() {
  historyModal.classList.remove("open");
  historyModal.setAttribute("aria-hidden", "true");
}

function closeWinnerModal() {
  winnerModal.classList.remove("open");
  winnerModal.setAttribute("aria-hidden", "true");
  stopConfettiLoop();
}

function removeLastWinnerFromEntries() {
  if (state.lastWinnerIndex < 0 || state.autoRemoveWinner) {
    return;
  }

  if (state.lastWinnerIndex >= state.entries.length) {
    return;
  }

  state.entries.splice(state.lastWinnerIndex, 1);
  entriesToText();
  buildWheelImage();
  updateStats();
  state.lastWinnerIndex = -1;
  winnerRemoveButton.hidden = true;
}

function spawnConfettiWave(amount = 130) {
  const center = getWheelCenterOnScreen();
  for (let idx = 0; idx < amount; idx += 1) {
    const centerBurst = idx < amount * 0.6;
    const angle = Math.random() * Math.PI * 2;
    const speed = centerBurst ? 2.8 + Math.random() * 6.5 : 1.5 + Math.random() * 4.5;
    const spawnX = centerBurst ? center.x : center.x + (Math.random() - 0.5) * 360;
    const spawnY = centerBurst ? center.y : center.y - 80 + (Math.random() - 0.5) * 160;

    state.confettiParticles.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (centerBurst ? 0.2 : 1.5),
      life: 85 + Math.random() * 85,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 2 + Math.random() * 6.5,
      shape: Math.random() > 0.45 ? "rect" : "circle",
    });
  }
}

function runConfettiFrame() {
  confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  state.confettiParticles = state.confettiParticles.filter((p) => p.life > 0 && p.size > 0.4);

  for (const p of state.confettiParticles) {
    p.life -= 1;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.994;
    p.size *= 0.996;

    confettiCtx.globalAlpha = Math.max(0, p.life / 140);
    confettiCtx.fillStyle = p.color;

    if (p.shape === "circle") {
      confettiCtx.beginPath();
      confettiCtx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      confettiCtx.fill();
    } else {
      confettiCtx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  confettiCtx.globalAlpha = 1;

  if (state.confettiParticles.length > 0) {
    state.confettiRafId = requestAnimationFrame(runConfettiFrame);
    return;
  }

  confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  state.confettiRafId = 0;
}

function startConfettiLoop() {
  resizeConfettiCanvas();
  stopConfettiLoop();
  state.confettiParticles = [];
  spawnConfettiWave(110);
  state.confettiWaveTimers.push(
    setTimeout(() => spawnConfettiWave(90), 240),
    setTimeout(() => spawnConfettiWave(70), 500),
  );

  if (!state.confettiRafId) {
    state.confettiRafId = requestAnimationFrame(runConfettiFrame);
  }
}

function stopConfettiLoop() {
  while (state.confettiWaveTimers.length > 0) {
    clearTimeout(state.confettiWaveTimers.pop());
  }
  state.confettiParticles = [];
  if (state.confettiRafId) {
    cancelAnimationFrame(state.confettiRafId);
    state.confettiRafId = 0;
  }
  confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function animateSpin(targetDeg) {
  const start = state.currentRotationDeg;
  const diff = targetDeg - start;
  const duration = 5200;
  const startTs = performance.now();

  function frame(now) {
    const elapsed = now - startTs;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 4);

    const next = start + diff * eased;
    canvas.style.transform = `rotate(${next}deg)`;
    updatePointerTickByRotation(next);

    if (t < 1) {
      requestAnimationFrame(frame);
      return;
    }

    state.currentRotationDeg = targetDeg;
    state.spinning = false;
    spinButton.disabled = false;
    wheelPointer.classList.remove("ticking");

    const winnerIndex = state.pendingWinnerIndex;
    const winner = winnerIndex >= 0 ? state.entries[winnerIndex] : null;
    state.pendingWinnerIndex = -1;

    if (!winner) {
      return;
    }

    state.lastWinnerIndex = winnerIndex;
    state.spinTotal += 1;
    updateStats();
    flashWinner(winner);
    addHistoryEntry(winner, false);

    if (state.autoRemoveWinner && winnerIndex >= 0) {
      state.entries.splice(winnerIndex, 1);
      entriesToText();
      buildWheelImage();
      updateStats();
      state.lastWinnerIndex = -1;
    }

    openWinnerModal(winner, state.historyEntries.length);
  }

  requestAnimationFrame(frame);
}

function spin() {
  if (state.spinning || state.entries.length === 0) {
    return;
  }

  state.spinning = true;
  spinButton.disabled = true;
  ensureAudioContext();
  closeWinnerModal();
  state.pointerSegmentIndex = getPointerSegmentIndex(state.currentRotationDeg);
  state.lastPointerTickTs = performance.now();

  const total = state.entries.length;
  const winnerIndex = Math.floor(Math.random() * total);
  state.pendingWinnerIndex = winnerIndex;

  const anglePer = 360 / total;
  const desiredNormalized = ((0 - ((winnerIndex + 0.5) * anglePer)) + 360) % 360;
  const currentNormalized = ((state.currentRotationDeg % 360) + 360) % 360;
  const correction = (desiredNormalized - currentNormalized + 360) % 360;
  const extraSpins = 8 + Math.floor(Math.random() * 6);
  const targetDeg = state.currentRotationDeg + extraSpins * 360 + correction;

  animateSpin(targetDeg);
}

function exportEntries() {
  if (!state.entries.length) {
    return;
  }

  const blob = new Blob([state.entries.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "roulette-entries.txt";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function importEntries(file) {
  if (!file) {
    return;
  }

  const text = await file.text();
  const parsed = normalizeEntries(text);
  entriesInput.value = parsed.join("\n");
  loadEntries();
}

function dedupeEntries() {
  const before = normalizeEntries(entriesInput.value);
  const unique = [...new Set(before.map((item) => item.toLowerCase()))];

  const map = new Map();
  for (const item of before) {
    const key = item.toLowerCase();
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  const result = unique.map((key) => map.get(key)).filter(Boolean);
  entriesInput.value = result.join("\n");
  loadEntries();
}

spinButton.addEventListener("click", spin);

loadEntriesButton.addEventListener("click", () => {
  loadEntries();
});

sampleButton.addEventListener("click", () => {
  setDefaultSample();
  loadEntries();
});

shuffleButton.addEventListener("click", () => {
  if (state.spinning || state.entries.length < 2) {
    return;
  }

  shuffleEntries();
  entriesToText();
  buildWheelImage();
});

removeWinnerToggle.addEventListener("click", () => {
  state.autoRemoveWinner = !state.autoRemoveWinner;
  syncAutoRemoveUI();
});

clearResultsButton.addEventListener("click", () => {
  state.historyEntries = [];
  renderWinnerHistory();
  lastWinner.textContent = "-";
  state.spinTotal = 0;
  state.lastWinnerIndex = -1;
  updateStats();
  closeWinnerModal();
  closeHistoryModal();
});

modeToggleButton.addEventListener("click", () => {
  state.mode = state.mode === "undian" ? "saksi" : "undian";
  syncModeUI();
});

winnerModalClose.addEventListener("click", closeWinnerModal);
winnerRemoveButton.addEventListener("click", removeLastWinnerFromEntries);
winnerModal.addEventListener("click", (event) => {
  if (event.target === winnerModal) {
    closeWinnerModal();
  }
});

historyModalOpenButton.addEventListener("click", openHistoryModal);
historyModalClose.addEventListener("click", closeHistoryModal);
historyModal.addEventListener("click", (event) => {
  if (event.target === historyModal) {
    closeHistoryModal();
  }
});

winnerHistoryModal.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const item = target.closest("li");
  if (!item) {
    return;
  }

  const index = Number.parseInt(item.dataset.index || "", 10);
  if (!Number.isInteger(index) || index < 0 || index >= state.historyEntries.length) {
    return;
  }

  const actionRaw = window.prompt("Ketik aksi: edit / hapus", "edit");
  if (actionRaw === null) {
    return;
  }

  const action = actionRaw.trim().toLowerCase();
  if (action === "edit") {
    const currentName = state.historyEntries[index].name;
    const nextName = window.prompt("Edit nama:", currentName);
    if (nextName === null) {
      return;
    }
    const trimmed = nextName.trim();
    if (!trimmed) {
      return;
    }
    state.historyEntries[index].name = trimmed;
    renderWinnerHistory();
    return;
  }

  if (action === "delete") {
    state.historyEntries.splice(index, 1);
    renderWinnerHistory();
    return;
  }

  if (action === "hapus") {
    state.historyEntries.splice(index, 1);
    renderWinnerHistory();
  }
});

manualWinnerAddButton.addEventListener("click", () => {
  if (state.mode === "saksi") {
    return;
  }

  const manualName = window.prompt("Tambah pemenang manual:")?.trim();
  if (!manualName) {
    return;
  }

  addHistoryEntry(manualName, true);
});

dedupeButton.addEventListener("click", dedupeEntries);
exportButton.addEventListener("click", exportEntries);

importFileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  await importEntries(file);
  importFileInput.value = "";
});

window.addEventListener("keydown", (event) => {
  const isCmdOrCtrl = event.metaKey || event.ctrlKey;
  if (event.key === "Escape") {
    closeWinnerModal();
  }

  if (isCmdOrCtrl && event.key.toLowerCase() === "enter") {
    event.preventDefault();
    loadEntries();
  }
});

window.addEventListener("resize", () => {
  renderWheel();
  resizeConfettiCanvas();
});

setDefaultSample();
resizeConfettiCanvas();
syncModeUI();
renderWinnerHistory();
loadEntries();
