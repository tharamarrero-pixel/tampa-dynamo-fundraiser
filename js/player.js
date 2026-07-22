import { db } from "./firebase.js";
import { PLAYERS, PLAYER_GOAL } from "./players.js";
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const params=new URLSearchParams(location.search);
const player=PLAYERS.find(p=>p.id===params.get("id"));
if(!player){location.replace("index.html");throw new Error("Unknown player");}

document.title=`Support ${player.name} | Tampa Dynamo`;
document.getElementById("playerName").textContent=player.name;
document.getElementById("playerJersey").textContent=player.jersey;
document.getElementById("headerText").textContent=`Support ${player.name} in the Tampa Dynamo 31 Day Challenge.`;

const calendar=document.getElementById("calendar");
const backdrop=document.getElementById("modalBackdrop");
const confirmBtn=document.getElementById("confirmBtn");
const fields={
  name:document.getElementById("donorName"), phone:document.getElementById("phone"),
  email:document.getElementById("email"), payment:document.getElementById("payment"),
  message:document.getElementById("message")
};
let selectedDay=null, reservations=new Map();

function safe(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function showError(message){const el=document.getElementById("errorBox");el.textContent=message;el.style.display="block";}
for(let day=1;day<=31;day++){
  const b=document.createElement("button");b.type="button";b.className="day";b.dataset.day=day;
  b.addEventListener("click",()=>openModal(day));calendar.appendChild(b);
}
function render(){
  let total=0;
  for(let day=1;day<=31;day++){
    const b=calendar.querySelector(`[data-day="${day}"]`),r=reservations.get(day);
    if(r){total+=day;b.disabled=true;b.className="day reserved";b.innerHTML=`<span class="lock">🔒</span><div class="day-num">DAY ${day}</div><div class="day-amount">$${day}</div><div class="reserved-by">Reserved by<br>${safe(r.name)}</div>`;}
    else{b.disabled=false;b.className="day";b.innerHTML=`<div class="day-num">DAY ${day}</div><div class="day-amount">$${day}</div>`;}
  }
  document.getElementById("reservedCount").textContent=`${reservations.size} / 31`;
  document.getElementById("playerTotal").textContent=`$${total.toLocaleString()}`;
  document.getElementById("playerProgress").style.width=`${Math.min(100,total/PLAYER_GOAL*100)}%`;
}
function openModal(day){
  if(reservations.has(day))return; selectedDay=day;
  document.getElementById("modalTitle").textContent=`Reserve Day ${day}`;
  document.getElementById("modalDescription").textContent=`You are supporting ${player.name} with a $${day} donation.`;
  Object.values(fields).forEach(f=>f.value="");backdrop.style.display="flex";setTimeout(()=>fields.name.focus(),100);
}
function closeModal(){backdrop.style.display="none";selectedDay=null;}
document.getElementById("cancelBtn").addEventListener("click",closeModal);
backdrop.addEventListener("click",e=>{if(e.target===backdrop)closeModal();});
confirmBtn.addEventListener("click",async()=>{
  const name=fields.name.value.trim(); if(!selectedDay||!name){alert("Please enter your name.");return;}
  confirmBtn.disabled=true;confirmBtn.textContent="Reserving...";
  try{
    const day=selectedDay,ref=doc(db,"players",player.id,"reservations",String(day));
    await runTransaction(db,async tx=>{
      const existing=await tx.get(ref);if(existing.exists())throw new Error("TAKEN");
      tx.set(ref,{playerId:player.id,playerName:player.name,day,amount:day,name,
        phone:fields.phone.value.trim(),email:fields.email.value.trim(),
        payment:fields.payment.value,message:fields.message.value.trim(),
        paid:false,createdAt:serverTimestamp()});
    });
    alert(`Thank you! Day ${day} is reserved for ${player.name}.`);closeModal();
  }catch(err){console.error(err);alert(err.message==="TAKEN"?"That day was just reserved. Please choose another day.":"The reservation could not be completed. Please try again.");}
  finally{confirmBtn.disabled=false;confirmBtn.textContent="Confirm reservation";}
});
onSnapshot(collection(db,"players",player.id,"reservations"),snap=>{
  reservations=new Map();snap.forEach(d=>{const v=d.data();reservations.set(Number(v.day??d.id),v);});render();
},err=>{console.error(err);showError("This calendar could not be loaded. Verify the Firestore rules.");});
document.getElementById("shareBtn").addEventListener("click",async()=>{
  const data={title:`${player.name} – Tampa Dynamo`,text:`Choose a day and support ${player.name}.`,url:location.href};
  try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);alert("Link copied.");}}catch(_){}
});
