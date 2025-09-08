
// v5.2 frontend with robust loading and error messages
const WORKER_BASE = window.WORKER_BASE;
const params = new URLSearchParams(location.search);
let ROOM = params.get("room") || "";
const statusEl = document.getElementById("status");

const roomInput = document.getElementById("roomInput");
const roomApply = document.getElementById("roomApply");
roomInput.value = ROOM;
roomApply.onclick = () => {
  const v = roomInput.value.trim();
  if (!v) { alert("Enter a room code"); return; }
  const url = new URL(location.href);
  url.searchParams.set("room", v);
  location.href = url.toString();
};

const meInput = document.getElementById("meInput");
const partnerInput = document.getElementById("partnerInput");
const renameBtn = document.getElementById("renameBtn");
const waterBtn = document.getElementById("waterBtn");
const fightBtn = document.getElementById("fightBtn");
const streakVal = document.getElementById("streakVal");
const bestVal = document.getElementById("bestVal");
const peaceVal = document.getElementById("peaceVal");
const fightsCount = document.getElementById("fightsCount");
const plantSvg = document.getElementById("plantSvg");
const activityList = document.getElementById("activityList");

function setStatus(msg, kind="info"){
  statusEl.textContent = msg || "";
  statusEl.style.color = kind === "error" ? "#a32626" : "#6b5b4a";
}

async function api(path = "", opts = {}) {
  const res = await fetch(`${WORKER_BASE}/room/${ROOM}${path}`, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function colorFromHealth(h){
  const t = Math.max(0, Math.min(1, h/100));
  const clay=[155,90,40], green=[0,180,137];
  const mix = (a,b,u)=> Math.round(a + (b-a)*u);
  return `rgb(${mix(clay[0],green[0],t)},${mix(clay[1],green[1],t)},${mix(clay[2],green[2],t)})`;
}

function renderPlant(state){
  const height = 150 + 12 * Math.sqrt(state.growth);
  const width = 520, potH = 60, potW = 200;
  const H = Math.max(420, height + potH + 90);
  const stemTopY = H - potH - 20 - height;
  const stemColor = colorFromHealth(state.health);

  const leafCount = Math.max(4, Math.floor(Math.log2(6 + state.growth)));
  let leaves = "";
  for(let i=0;i<leafCount;i++){
    const t = (i+1)/(leafCount+1);
    const y = H - potH - 20 - height * t;
    const side = i % 2 === 0 ? 1 : -1;
    const x = width/2 + side * (60 + (i%3)*18);
    const r = 20 + (i%3)*6;
    const pid = `m${i}`;
    const A = i%3===0 ? "#173826" : i%3===1 ? "#1a2a3a" : "#2a1a3a";
    const B = i%3===0 ? "#00b489" : i%3===1 ? "#6b5cff" : "#ff6aa6";
    const C = i%3===0 ? "#33e6a7" : i%3===1 ? "#8c84ff" : "#ff99c0";
    leaves += `
      <pattern id="${pid}" width="26" height="26" patternUnits="userSpaceOnUse">
        <rect width="26" height="26" fill="${A}"/>
        <path d="M0 26 L26 0 M-4 8 L18 30 M8 -4 L30 18" stroke="${B}" stroke-width="4" opacity="0.35"/>
        <circle cx="13" cy="13" r="7" fill="${C}" opacity="0.7"/>
      </pattern>
      <path d="M ${x} ${y}
               C ${x + side*24} ${y - r},
                 ${x + side*36} ${y + r},
                 ${x} ${y + r*1.7}
               C ${x - side*36} ${y + r},
                 ${x - side*24} ${y - r},
                 ${x} ${y} Z"
            fill="url(#${pid})" opacity="0.95" />
    `;
  }

  const stem = `M ${width/2} ${H - potH - 20}
                C ${width/2 - 44} ${H - potH - height*0.45},
                  ${width/2 + 52} ${H - potH - height*0.78},
                  ${width/2} ${stemTopY}`;

  plantSvg.setAttribute("viewBox", `0 0 ${width} ${H}`);
  plantSvg.innerHTML = `
    <defs>
      <linearGradient id="pot" x1="0" x2="1">
        <stop offset="0%" stop-color="#7a4a22"/>
        <stop offset="100%" stop-color="#4f3218"/>
      </linearGradient>
    </defs>
    <rect x="${(width-potW)/2}" y="${H-potH-8}" width="${potW}" height="${potH}" rx="20" fill="url(#pot)" />
    <ellipse cx="${width/2}" cy="${H-potH-8}" rx="${potW/2}" ry="14" fill="#302315" />
    <path d="${stem}" stroke="${stemColor}" stroke-width="12" fill="none" />
    ${leaves}
    <circle cx="${width/2}" cy="${stemTopY}" r="14" fill="${stemColor}" />
  `;
}

function renderStats(state){
  streakVal.textContent = state.streak;
  bestVal.textContent = state.bestStreak;
  peaceVal.textContent = state.totalPeaceDays;
  fightsCount.textContent = state.totalFights;
  meInput.value = state.me;
  partnerInput.value = state.partner;
}

function renderHistory(state){
  activityList.innerHTML = "";
  const arr = [...state.history].reverse();
  for(const h of arr){
    const li = document.createElement("li");
    const date = document.createElement("div");
    date.className = "date"; date.textContent = h.date;
    const who = document.createElement("div");
    who.className = "who"; who.textContent = h.by;
    const act = document.createElement("div");
    act.className = "act"; act.textContent = h.action === "water" ? "💧 Water" : "⚡ Fight";
    li.appendChild(date); li.appendChild(who); li.appendChild(act);
    activityList.appendChild(li);
  }
}

function todayStr(){ const d = new Date(); return d.toISOString().slice(0,10); }

async function loadDemo(){
  const demo = { me:"Me", partner:"Partner", growth:14, health:86, streak:5, bestStreak:12, totalPeaceDays:58, totalFights:4, history: [] };
  renderPlant(demo); renderStats(demo); renderHistory(demo);
}

async function loadFromRoom(){
  try{
    setStatus("Loading room…");
    const data = await api();
    renderPlant(data); renderStats(data); renderHistory(data);
    setStatus("Loaded");
    setTimeout(()=> setStatus(""), 1200);
  }catch(err){
    setStatus("Could not reach the server. Try again or host on GitHub Pages.", "error");
    // keep demo plant visible
  }
}

async function init(){
  await loadDemo();
  if (ROOM) await loadFromRoom();
}
init();

renameBtn.onclick = async ()=>{
  const me = meInput.value.trim() || "Me";
  const partner = partnerInput.value.trim() || "Partner";
  if (!ROOM){ setStatus("Add ?room=code to save names", "error"); return; }
  try{
    const res = await api("", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "rename", me, partner })
    });
    renderStats(res.state); setStatus("Names saved");
    setTimeout(()=> setStatus(""), 1200);
  }catch(err){ setStatus("Save failed", "error"); }
};

waterBtn.onclick = async ()=>{
  if (!ROOM){ setStatus("Add ?room=code to log", "error"); return; }
  try{
    const res = await api("", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "log", action: "water", by: "Me", date: todayStr() })
    });
    renderPlant(res.state); renderStats(res.state); renderHistory(res.state);
    setStatus("Watered");
    setTimeout(()=> setStatus(""), 1000);
  }catch(err){ setStatus("Could not log", "error"); }
};

fightBtn.onclick = async ()=>{
  if (!ROOM){ setStatus("Add ?room=code to log", "error"); return; }
  try{
    const res = await api("", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "log", action: "fight", by: "Me", date: todayStr() })
    });
    renderPlant(res.state); renderStats(res.state); renderHistory(res.state);
    setStatus("Logged fight");
    setTimeout(()=> setStatus(""), 1000);
  }catch(err){ setStatus("Could not log", "error"); }
};
