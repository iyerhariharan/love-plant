// --- config -------------------------------------------------
const WORKER = window.WORKER_BASE;              // set in index.html
const qs = new URLSearchParams(location.search);
let ROOM = qs.get("room") || "";

// --- dom ----------------------------------------------------
const meInput       = document.getElementById("meInput");
const partnerInput  = document.getElementById("partnerInput");
const renameBtn     = document.getElementById("renameBtn");
const waterBtn      = document.getElementById("waterBtn");
const fightBtn      = document.getElementById("fightBtn");
const statusBox     = document.getElementById("status");
const statStreak    = document.querySelector('[data-stat="streak"]');
const statBest      = document.querySelector('[data-stat="best"]');
const statPeace     = document.querySelector('[data-stat="peace"]');
const statFights    = document.querySelector('[data-stat="fights"]');
const whoMeRadio    = document.getElementById("whoMe");       // NEW
const whoParRadio   = document.getElementById("whoPartner");  // NEW
const whoMeLabel    = document.getElementById("whoMeLabel");  // NEW
const whoParLabel   = document.getElementById("whoPartnerLabel"); // NEW
const plantSvg      = document.getElementById("plantSvg");

// --- helpers ------------------------------------------------
const setStatus = (msg="") => (statusBox.textContent = msg);

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const currentMember = () =>
  (document.querySelector('input[name="who"]:checked')?.value) || "Me";

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
  // surface error details so we can show a useful message
  if (!r.ok) {
    let t = "";
    try { t = await r.text(); } catch {}
    throw new Error(`POST ${r.status} ${t}`);
  }
  return r.json();
}

function paint(state) {
  // numbers
  statStreak.textContent = state.streak ?? 0;
  statBest.textContent   = state.bestStreak ?? 0;
  statPeace.textContent  = state.totalPeaceDays ?? 0;
  statFights.textContent = state.totalFights ?? 0;

  // name inputs
  if (meInput && partnerInput) {
    if (meInput.value !== state.me) meInput.value = state.me;
    if (partnerInput.value !== state.partner) partnerInput.value = state.partner;
  }
  // radio labels (top-right)
  if (whoMeLabel)    whoMeLabel.textContent = state.me || "Me";
  if (whoParLabel)   whoParLabel.textContent = state.partner || "Partner";

  // draw plant
  drawPlant(state);
}

// simple plant so you see something even if styles change
function drawPlant(state) {
  if (!plantSvg) return;
  const hearts = 4;
  const g = [];
  for (let i=0;i<hearts;i++) {
    const x = 220 + Math.cos((i/hearts)*Math.PI*2)*80;
    const y = 300 + Math.sin((i/hearts)*Math.PI*2)*60;
    g.push(`<circle cx="${x}" cy="${y}" r="18" fill="#7bd" opacity=".9"/>`);
  }
  // stem length reacts a bit to streak
  const stemH = Math.min(220, 120 + (state.streak||0)*8);
  plantSvg.innerHTML = `
    <defs>
      <radialGradient id="potG" cx="50%" cy="30%">
        <stop offset="0" stop-color="#7a4a27"/>
        <stop offset="1" stop-color="#42240f"/>
      </radialGradient>
    </defs>
    <rect x="170" y="${360 - 10}" width="180" height="36" rx="18" fill="url(#potG)"/>
    <ellipse cx="260" cy="${360 - 10}" rx="92" ry="14" fill="#2e1c10" opacity=".7"/>
    <path d="M260 ${360-10} C 260 ${360-stemH/3}, 250 ${360-stemH*2/3}, 260 ${360-stemH}"
          stroke="#1fbf83" stroke-width="10" fill="none" stroke-linecap="round"/>
    ${g.join("")}
  `;
}

// --- boot ---------------------------------------------------
async function loadRoom() {
  if (!ROOM) {
    setStatus("Add ?room=code to the link");
    return;
  }
  try {
    setStatus("");
    const state = await apiGet(ROOM);
    paint(state);
  } catch (e) {
    setStatus("Could not reach the server. Try again or host on GitHub Pages.");
  }
}
window.addEventListener("DOMContentLoaded", loadRoom);

// keep “who” in sync visually (not needed for function, but nice UX)
whoMeRadio?.addEventListener("change", () => setStatus(""));
whoParRadio?.addEventListener("change", () => setStatus(""));

// --- actions ------------------------------------------------
renameBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, {
      op: "rename",
      me: meInput.value.trim() || "Me",
      partner: partnerInput.value.trim() || "Partner",
    });
    paint(res.state);                 // updates radio labels too
    setStatus("");
  } catch {
    setStatus("Save failed");
  }
});

waterBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, {
      op: "log",
      action: "water",
      by: currentMember(),            // <— uses radio
      date: today()
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    if (String(e.message).includes("already logged")) {
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
      by: currentMember(),            // <— uses radio
      date: today()
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    if (String(e.message).includes("already logged")) {
      setStatus("already logged today by this member");
    } else {
      setStatus("Could not log");
    }
  }
});
