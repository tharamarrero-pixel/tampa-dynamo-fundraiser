import { db, auth } from "./firebase.js";
import { PLAYERS } from "./players.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { collection, collectionGroup, deleteDoc, doc, getDocs, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const loginPanel=document.getElementById("loginPanel"),dashboard=document.getElementById("dashboard");
const rows=document.getElementById("reservationRows"),empty=document.getElementById("emptyState");
const playerFilter=document.getElementById("playerFilter"),donorFilter=document.getElementById("donorFilter");
let records=[],unsubscribe=null;

function showError(message){const el=document.getElementById("errorBox");el.textContent=message;el.style.display="block";}
function clearError(){const el=document.getElementById("errorBox");el.style.display="none";el.textContent="";}
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

playerFilter.innerHTML='<option value="">All players</option>'+PLAYERS.map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join("");

document.getElementById("loginBtn").addEventListener("click",async()=>{
  clearError();
  try{await signInWithEmailAndPassword(auth,document.getElementById("adminEmail").value.trim(),document.getElementById("adminPassword").value);}
  catch(e){console.error(e);showError("Sign-in failed. Verify the Firebase Authentication account and password.");}
});
document.getElementById("logoutBtn").addEventListener("click",()=>signOut(auth));

function render(){
  const p=playerFilter.value,q=donorFilter.value.trim().toLowerCase();
  const filtered=records.filter(r=>(!p||r.playerId===p)&&(!q||`${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(q)));
  rows.innerHTML=filtered.map(r=>`<tr>
    <td>${safe(r.playerName)}</td><td>$${r.day}</td><td>${safe(r.name)}</td>
    <td>${safe(r.email||r.phone||"—")}</td><td>${safe(r.payment||"—")}</td>
    <td><span class="badge ${r.paid?"badge-paid":"badge-unpaid"}">${r.paid?"Paid":"Unpaid"}</span></td>
    <td><button class="btn btn-light" data-paid="${r.path}" data-next="${!r.paid}">${r.paid?"Mark unpaid":"Mark paid"}</button>
    <button class="btn btn-danger" data-delete="${r.path}">Release</button></td></tr>`).join("");
  empty.style.display=filtered.length?"none":"block";
  const committed=records.reduce((s,r)=>s+Number(r.amount||0),0),paid=records.filter(r=>r.paid).reduce((s,r)=>s+Number(r.amount||0),0);
  document.getElementById("adminReservationCount").textContent=records.length;
  document.getElementById("adminCommitted").textContent=`$${committed.toLocaleString()}`;
  document.getElementById("adminPaid").textContent=`$${paid.toLocaleString()}`;
}
rows.addEventListener("click",async e=>{
  const paid=e.target.closest("[data-paid]"),del=e.target.closest("[data-delete]");
  try{
    if(paid)await updateDoc(doc(db,paid.dataset.paid),{paid:paid.dataset.next==="true"});
    if(del&&confirm("Release this reserved day?"))await deleteDoc(doc(db,del.dataset.delete));
  }catch(err){console.error(err);showError("The admin action was denied. Confirm the admin email in firestore.rules and publish the rules.");}
});
playerFilter.addEventListener("change",render);donorFilter.addEventListener("input",render);

function startDashboard(){
  loginPanel.classList.add("hidden");dashboard.classList.remove("hidden");
  unsubscribe=onSnapshot(collectionGroup(db,"reservations"),snap=>{
    records=snap.docs.map(d=>({...d.data(),path:d.ref.path})).sort((a,b)=>(a.playerName||"").localeCompare(b.playerName||"")||a.day-b.day);render();
  },err=>{console.error(err);showError("Admin access was denied. Confirm the admin email in firestore.rules.");});
}
onAuthStateChanged(auth,user=>{
  if(user){clearError();startDashboard();}
  else{if(unsubscribe)unsubscribe();unsubscribe=null;records=[];dashboard.classList.add("hidden");loginPanel.classList.remove("hidden");}
});
document.getElementById("exportBtn").addEventListener("click",()=>{
  const cols=["Player","Day","Amount","Donor","Phone","Email","Payment","Paid","Message"];
  const quote=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv=[cols.join(","),...records.map(r=>[r.playerName,r.day,r.amount,r.name,r.phone,r.email,r.payment,r.paid?"Yes":"No",r.message].map(quote).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="tampa-dynamo-reservations.csv";a.click();URL.revokeObjectURL(a.href);
});
