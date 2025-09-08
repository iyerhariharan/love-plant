// ---------------- config ----------------
const WORKER = window.WORKER_BASE; // set in index.html
const qs = new URLSearchParams(location.search);
const $ = (sel) => document.querySelector(sel);

const roomInput = $("#roomInput");
const roomApply = $("#roomApply");
const whoRadios  = document.querySelectorAll('input[name="who"]');

const meInput       = $("#meInput");
const partnerInput  = $("#partnerInput");
const renameBtn     = $("#renameBtn");
const waterBtn      = $("#waterBtn");
const fightBtn      = $("#fightBtn");

const statusBox  = $("#status");
const statStreak = $("#streakVal");
const statBest   = $("#bestVal");
const statPeace  = $("#peaceVal");
const statFights = $("#fightsCount");

// state kept in localStorage so the page remembers
const store = {
  get room() { return qs.get("room") || localStorage.getItem("room") || ""; },
  set room(v) { localStorage.setItem("room", v || ""); },

  get who() { return localStorage.getItem("who") || "Me"; },
  set who(v) { localStorage.setItem("who", v === "Partner" ? "Partner" : "Me"); },
};

function setStatus(msg) { statusBox.textContent = msg || ""; }

// UTC date string YYYY-MM-DD so both people agree on the day
function todayUTC() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function apiGet(room) {
  const r = await fetch(`${WORKER}/room/${encodeURIComponent(room)}`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  return r.json();
}

async function apiPost(room, body) {
  const r = await fetch(`${WORKER}/room/${encodeURIComponent(room)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    // bubble up short server messages if possible
    let txt = "";
    try { txt = (await r.json()).error || ""; } catch {}
    throw new Error(txt || `POST ${r.status}`);
  }
  return r.json();
}

function paint(state) {
  statStreak.textContent = state.streak ?? 0;
  statBest.textContent   = state.bestStreak ?? 0;
  statPeace.textContent  = state.totalPeaceDays ?? 0;
  statFights.textContent = state.totalFights ?? 0;
  if (meInput && partnerInput) {
    meInput.value = state.me ?? "Me";
    partnerInput.value = state.partner ?? "Partner";
  }
}

// load room on start
async function loadRoom() {
  const room = store.room;
  if (roomInput) roomInput.value = room;

  // set identity radios
  const who = store.who;
  whoRadios.forEach(r => { r.checked = (r.value === who); });

  if (!room) {
    setStatus("Add ?room=code to the link, or type a code above");
    return;
  }
  try {
    setStatus("");
    const state = await apiGet(room);
    paint(state);
  } catch (e) {
    setStatus("Could not reach the server");
  }
}

// identity change
whoRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      store.who = radio.value;
    }
  });
});

// room apply
roomApply?.addEventListener("click", () => {
  const v = (roomInput.value || "").trim();
  if (!v) return;
  store.room = v;
  // rewrite the URL so you can share it
  const url = new URL(location.href);
  url.searchParams.set("room", v);
  history.replaceState(null, "", url.toString());
  loadRoom();
});

// save names
renameBtn?.addEventListener("click", async () => {
  const room = store.room;
  if (!room) return setStatus("Add ?room=code to the link");

  try {
    const res = await apiPost(room, {
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

// water
waterBtn?.addEventListener("click", async () => {
  const room = store.room;
  if (!room) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(room, {
      op: "log",
      action: "water",
      by: store.who,          // important: Me or Partner
      date: todayUTC(),
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    setStatus(e.message || "Could not log");
  }
});

// fight
fightBtn?.addEventListener("click", async () => {
  const room = store.room;
  if (!room) return setStatus("Add ?room=code to the link");
  try {
    const res = await apiPost(room, {
      op: "log",
      action: "fight",
      by: store.who,          // important: Me or Partner
      date: todayUTC(),
    });
    paint(res.state);
    setStatus("");
  } catch (e) {
    setStatus(e.message || "Could not log");
  }
});

// boot
window.addEventListener("DOMContentLoaded", loadRoom);
