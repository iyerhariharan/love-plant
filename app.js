// ----- config -------------------------------------------------
const WORKER = window.WORKER_BASE;               // set in index.html
const qs = new URLSearchParams(location.search);
let ROOM = qs.get("room") || "";

// ----- dom ----------------------------------------------------
const roomInput   = document.getElementById("roomInput");
const roomApply   = document.getElementById("roomApply");

const meInput     = document.getElementById("meInput");
const partnerInput= document.getElementById("partnerInput");
const renameBtn   = document.getElementById("renameBtn");

const waterBtn    = document.getElementById("waterBtn");
const fightBtn    = document.getElementById("fightBtn");

const statusBox   = document.getElementById("status");
const statStreak  = document.querySelector('[data-stat="streak"], #streakVal');
const statBest    = document.querySelector('[data-stat="best"], #bestVal');
const statPeace   = document.querySelector('[data-stat="peace"], #peaceVal');
const statFights  = document.querySelector('[data-stat="fights"], #fightsCount');

const whoTextMe        = document.getElementById("whoTextMe");
const whoTextPartner   = document.getElementById("whoTextPartner");
const plantSvg         = document.getElementById("plantSvg");

// ----- helpers ------------------------------------------------
function setStatus(msg) {
  statusBox.textContent = msg || "";
}

function selectedWho() {
  const r = document.querySelector('input[name="who"]:checked');
  return r ? r.value : "Me";
}

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function apiGet(room) {
  const url = `${WORKER}/room/${encodeURIComponent(room)}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  return r.json();
}

async function apiPost(room, body) {
  const url = `${WORKER}/room/${encodeURIComponent(room)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // 409 = already logged today by this member -> bubble up for friendly message
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    const msg = (() => {
      try { return JSON.parse(text).error; } catch { return text || `POST ${r.status}`; }
    })();
    throw new Error(msg || `POST ${r.status}`);
  }
  return r.json();
}

function paintStats(state) {
  if (statStreak)  statStreak.textContent  = state.streak ?? 0;
  if (statBest)    statBest.textContent    = state.bestStreak ?? 0;
  if (statPeace)   statPeace.textContent   = state.totalPeaceDays ?? 0;
  if (statFights)  statFights.textContent  = state.totalFights ?? 0;
}

function paintNames(state) {
  // inputs
  if (meInput && meInput.value !== state.me) meInput.value = state.me;
  if (partnerInput && partnerInput.value !== state.partner) partnerInput.value = state.partner;
  // radio labels
  if (whoTextMe) whoTextMe.textContent = state.me || "Me";
  if (whoTextPartner) whoTextPartner.textContent = state.partner || "Partner";
}

function drawPlant(state) {
  if (!plantSvg) return;
  // simplistic, but pretty: clear + redraw based on growth/health
  plantSvg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";

  // background pot
  const pot = document.createElementNS(ns, "ellipse");
  pot.setAttribute("cx", "260");
  pot.setAttribute("cy", "440");
  pot.setAttribute("rx", "110");
  pot.setAttribute("ry", "28");
  pot.setAttribute("fill", "#3b2718");
  plantSvg.appendChild(pot);

  // stem height proportional to growth (0..100 => 120..260)
  const stemH = 120 + Math.min(100, Math.max(0, state.growth ?? 0)) * 1.4;
  const stem = document.createElementNS(ns, "path");
  stem.setAttribute(
    "d",
    `M260,420 C260,${420 - stemH * 0.5} 260,${420 - stemH * 0.8} 260,${420 - stemH}`
  );
  stem.setAttribute("stroke", "#1fbf7a");
  stem.setAttribute("stroke-width", "12");
  stem.setAttribute("fill", "none");
  stem.setAttribute("stroke-linecap", "round");
  plantSvg.appendChild(stem);

  // heart helper
  const heart = (cx, cy, scale, color) => {
    const p = document.createElementNS(ns, "path");
    // simple heart path around 0,0; translate+scale
    p.setAttribute(
      "d",
      "M0,-8 C-6,-18 -24,-10 -24,5 C-24,20 -8,28 0,36 C8,28 24,20 24,5 C24,-10 6,-18 0,-8 Z"
    );
    p.setAttribute(
      "transform",
      `translate(${cx},${cy}) scale(${scale})`
    );
    p.setAttribute("fill", color);
    p.setAttribute("opacity", "0.9");
    plantSvg.appendChild(p);
  };

  // colors shift a bit with health
  const health = Math.min(100, Math.max(0, state.health ?? 80));
  const good = health >= 60;
  const c1 = good ? "#24d6a1" : "#9bbf3b";
  const c2 = good ? "#4d9cff" : "#7aa0d8";
  const c3 = good ? "#ff7ab6" : "#b46f96";
  const c4 = good ? "#41d672" : "#b3d641";

  heart(200, 360, 1.0, c1);
  heart(322, 358, 1.0, c2);
  heart(236, 300, 0.9, c3);
  heart(304, 296, 0.9, c4);
}

function paint(state) {
  paintStats(state);
  paintNames(state);
  drawPlant(state);
}

// ----- boot / room handling ----------------------------------
async function loadRoom() {
  if (!ROOM) {
    setStatus("Add ?room=code to the link");
    return;
  }
  if (roomInput) roomInput.value = ROOM;
  try {
    setStatus("");
    const state = await apiGet(ROOM);
    paint(state);
  } catch (e) {
    setStatus("Could not reach the server. Try again or host on GitHub Pages.");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (ROOM && roomInput) roomInput.value = ROOM;
  loadRoom();
});

// allow changing room via the box
roomApply?.addEventListener("click", () => {
  const code = (roomInput?.value || "").trim();
  if (!code) return;
  // update URL so you can share the link
  const u = new URL(location.href);
  u.searchParams.set("room", code);
  history.replaceState(null, "", u.toString());
  ROOM = code;
  loadRoom();
});

// ----- actions -----------------------------------------------
renameBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, {
      op: "rename",
      me: meInput.value.trim() || "Me",
      partner: partnerInput.value.trim() || "Partner",
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    setStatus("Save failed");
  }
});

waterBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, {
      op: "log",
      action: "water",
      by: selectedWho(),
      date: today(),
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    if (String(e.message).includes("already logged today")) {
      setStatus("already logged today by this member");
    } else {
      setStatus("Could not log");
    }
  }
});

fightBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, {
      op: "log",
      action: "fight",
      by: selectedWho(),
      date: today(),
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    if (String(e.message).includes("already logged today")) {
      setStatus("already logged today by this member");
    } else {
      setStatus("Could not log");
    }
  }
});
