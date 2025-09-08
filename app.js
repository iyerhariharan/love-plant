// --- config -------------------------------------------------
const WORKER = window.WORKER_BASE; // set in index.html
const qs = new URLSearchParams(location.search);
let ROOM = qs.get("room") || "";

// --- dom ----------------------------------------------------
const meInput = document.getElementById("meInput");
const partnerInput = document.getElementById("partnerInput");
const renameBtn = document.getElementById("renameBtn");
const waterBtn = document.getElementById("waterBtn");
const fightBtn = document.getElementById("fightBtn");

const statusBox = document.getElementById("status");     // red text area at top
const statStreak = document.querySelector('[data-stat="streak"]');
const statBest   = document.querySelector('[data-stat="best"]');
const statPeace  = document.querySelector('[data-stat="peace"]');
const statFights = document.querySelector('[data-stat="fights"]');

// --- helpers ------------------------------------------------
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
  if (!r.ok) throw new Error(`POST ${r.status}`);
  return r.json();
}
function paint(state) {
  statStreak.textContent = state.streak ?? 0;
  statBest.textContent   = state.bestStreak ?? 0;
  statPeace.textContent  = state.totalPeaceDays ?? 0;
  statFights.textContent = state.totalFights ?? 0;
  if (meInput && partnerInput) {
    if (meInput.value !== state.me) meInput.value = state.me;
    if (partnerInput.value !== state.partner) partnerInput.value = state.partner;
  }
}

// --- boot ---------------------------------------------------
async function loadRoom() {
  if (!ROOM) {
    setStatus("Add ?room=code to the link");
    return;
  }
  try {
    setStatus("");
    const { me, partner, ...rest } = await apiGet(ROOM);
    paint({ me, partner, ...rest });
  } catch (e) {
    setStatus("Could not reach the server. Try again or host on GitHub Pages.");
  }
}
window.addEventListener("DOMContentLoaded", loadRoom);

// --- actions ------------------------------------------------
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
  } catch {
    setStatus("Save failed");
  }
});

waterBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, { op: "log", action: "water", by: "Me", date: today() });
    paint(res.state);
    setStatus("");
  } catch {
    setStatus("Could not log");
  }
});

fightBtn?.addEventListener("click", async () => {
  if (!ROOM) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(ROOM, { op: "log", action: "fight", by: "Me", date: today() });
    paint(res.state);
    setStatus("");
  } catch {
    setStatus("Could not log");
  }
});
