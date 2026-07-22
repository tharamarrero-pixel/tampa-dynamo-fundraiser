import { db } from "./firebase.js";
import { PLAYERS, PLAYER_GOAL } from "./players.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const grid = document.getElementById("playerGrid");
const searchInput = document.getElementById("searchInput");
const teamTotalEl = document.getElementById("teamTotal");
const teamProgressEl = document.getElementById("teamProgress");
const teamGoal = PLAYER_GOAL * PLAYERS.length;
const totals = new Map();
const cards = new Map();

document.getElementById("teamGoal").textContent = `$${teamGoal.toLocaleString()}`;

function safe(value){return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function showError(message){const el=document.getElementById("errorBox");el.textContent=message;el.style.display="block";}

function renderCards(){
  grid.innerHTML="";
  PLAYERS.forEach(player=>{
    const a=document.createElement("a");
    a.href=`player.html?id=${encodeURIComponent(player.id)}`;
    a.className="player-card";
    a.dataset.search=`${player.name} ${player.jersey}`.toLowerCase();
    a.innerHTML=`<div class="player-card-top"><div class="player-name">${safe(player.name)}</div><span class="jersey">${safe(player.jersey)}</span></div>
      <div class="meta"><span data-days>0/31 days</span> · <span data-total>$0</span> of $496</div>
      <div class="mini-progress"><span data-progress></span></div>`;
    grid.appendChild(a); cards.set(player.id,a);
  });
}

function updateTeam(){
  let total=0; for(const item of totals.values()) total+=item.total;
  teamTotalEl.textContent=`$${total.toLocaleString()}`;
  teamProgressEl.style.width=`${Math.min(100,total/teamGoal*100)}%`;
}

function subscribe(){
  PLAYERS.forEach(player=>{
    onSnapshot(collection(db,"players",player.id,"reservations"),snap=>{
      let total=0;
      snap.forEach(d=>{const v=d.data();total+=Number(v.amount||v.day||0);});
      totals.set(player.id,{total,count:snap.size});
      const card=cards.get(player.id);
      card.querySelector("[data-days]").textContent=`${snap.size}/31 days`;
      card.querySelector("[data-total]").textContent=`$${total.toLocaleString()}`;
      card.querySelector("[data-progress]").style.width=`${Math.min(100,total/PLAYER_GOAL*100)}%`;
      updateTeam();
    },err=>{console.error(err);showError("The fundraiser data could not be loaded. Verify the Firestore rules.");});
  });
}

searchInput.addEventListener("input",()=>{
  const q=searchInput.value.trim().toLowerCase();
  cards.forEach(card=>card.style.display=card.dataset.search.includes(q)?"block":"none");
});
renderCards(); subscribe();
