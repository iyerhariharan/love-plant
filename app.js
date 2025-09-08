"use strict";

/* ===============================
   Love Plant front-end (no build)
   =============================== */

/* --- config --- */
const WORKER = window.WORKER_BASE;      // set in index.html
const qs = new URLSearchParams(location.search);
let ROOM = qs.get("room") || "";         // ?room=demo555

/* --- dom --- */
const meInput       = document.getElementById("meInput");
const partnerInput  = document.getElementById("partnerInput");
const renameBtn     = document.getElementById("renameBtn");
const waterBtn      = document.getElementById("waterBtn");
const fightBtn      = document.getElementById("fightBtn");

const statusBox     = document.getElementById("status");

const streakVal     = document.getElementById("streakVal");
const bestVal       = document.getElementById("bestVal");
const peaceVal      = document.getElementById("peaceVal");
const fightsCount   = document.getElementById("fightsCount");

const plantSvg      = document.getElementById("plantSvg"); // optional drawing

/* --- helpers --- */
function setStatus(msg) {
  statusBox.textContent = msg || "";
}

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function apiGet(room) {
  const url = `${WORKER}/room/${encodeURIComponent(room)}`;
  console.log("GET ->", url);
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  return r.json();
}

async function apiPost(room, body) {
  const url = `${WORKER}/room/${encodeURIComponent(room)}`;
  console.log("POST ->", url, body);
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${r.status}`);
  return r.json();
}

function paint(state) {
  // stats
  if (streakVal)   streakVal.textContent   = state.streak ?? 0;
  if (bestVal)     bestVal.textContent     = state.bestStreak ?? 0;
  if (peaceVal)    peaceVal.textContent    = state.totalPeaceDays ?? 0;
  if (fightsCount) fightsCount.textContent = state.totalFights ?? 0;

  // names
  if (meInput && typeof state.me === "string") meInput.value = state.me;
  if (partnerInput && typeof state.partner === "string") partnerInput.value = state.partner;

  // simple surreal plant draw based on growth and health
  if (!plantSvg) return;
  const growth = Number(state.growth ?? 0);
  const health = Number(state.health ?? 80);

  const hue = 120 * Math.max(0, Math.min(1, health / 100)); // green to brownish
  const stemH = 120 + Math.min(260, growth * 6);            // taller with growth
  const bend  = Math.min(70, Math.max(-70, (50 - health) * 1.2));

  plantSvg.innerHTML = `
    <defs>
      <radialGradient id="potGrad" cx="50%" cy="30%">
        <stop offset="0%" stop-color="#5a341a" />
        <stop offset="100%" stop-color="#3a2414" />
      </radialGradient>
    </defs>

    <!-- pot -->
    <ellipse cx="260" cy="430" rx="120" ry="26" fill="#2b1a10" opacity="0.9"/>
    <rect x="150" y="380" width="220" height="70" rx="20" fill="url(#potGrad)" />

    <!-- stem -->
    <g transform="translate(260 380)">
      <path d="
        M 0 0
        C ${bend * 0.3} ${-stemH * 0.25},
          ${bend * 0.7} ${-stemH * 0.6},
          ${bend} ${-stemH}
      " fill="none" stroke="hsl(${hue} 70% 40%)" stroke-width="16" stroke-linecap="round"/>
      <circle cx="${bend}" cy="${-stemH}" r="14" fill="hsl(${hue} 70% 35%)"/>
    </g>

    <!-- floating hearts -->
    ${[0,1,2,3].map(i => {
      const a = i * Math.PI / 2;
      const r = 70 + (growth % 8) * 4;
      const x = 260 + Math.cos(a) * r;
      const y = 300 + Math.sin(a) * (r * 0.7);
      const s = 1 + ((growth + i) % 3) * 0.12;
      return `
        <g transform="translate(${x} ${y}) scale(${s})">
          <path d="M0 -10 C-10 -25, -35 -5, 0 20 C35 -5, 10 -25, 0 -10Z"
                fill="hsl(${(hue + i*30) % 360} 65% 50%)" opacity="0.85"/>
        </g>
      `;
    }).join("")}
  `;
}

/* --- boot --- */
async function loadRoom() {
  console.log("LovePlant boot", { WORKER, ROOM });
  if (!ROOM) {
    setStatus("Add ?room=code to the link");
    return;
  }
  try {
    setStatus("");
    const state = await apiGet(ROOM);
    paint(state);
  } catch (e) {
    console.error(e);
    setStatus("Could not reach the server. Try again or host on GitHub Pages.");
  }
}

window.addEventListener("DOMContentLoaded", loadRoom);

/* --- actions --- */
renameBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, {
      op: "rename",
      me: (meInput.value || "Me").trim(),
      partner: (partnerInput.value || "Partner").trim(),
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    console.error(e);
    setStatus("Save failed");
  }
});

waterBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, { op: "log", action: "water", by: "Me", date: today() });
    paint(res.state);
    setStatus("");
  } catch (e) {
    console.error(e);
    setStatus("Could not log");
  }
});

fightBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, { op: "log", action: "fight", by: "Me", date: today() });
    paint(res.state);
    setStatus("");
  } catch (e) {
    console.error(e);
    setStatus("Could not log");
  }
});
