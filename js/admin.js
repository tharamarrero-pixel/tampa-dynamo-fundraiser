import { db, auth } from "./firebase.js";
import { PLAYERS } from "./players.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const authLoading = document.getElementById("authLoading");
const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const errorBox = document.getElementById("errorBox");
const successBox = document.getElementById("successBox");
const loginBtn = document.getElementById("loginBtn");
const rows = document.getElementById("reservationRows");
const empty = document.getElementById("emptyState");
const playerFilter = document.getElementById("playerFilter");
const donorFilter = document.getElementById("donorFilter");

const ADMIN_EMAILS = new Set([
  "thara.marrero@gmail.com",
  "ltorresvargas78@gmail.com"
]);

let recordsByPlayer = new Map();
let unsubscribeFunctions = [];

function showError(message) {
  successBox.style.display = "none";
  errorBox.textContent = message;
  errorBox.style.display = "block";
}
function showSuccess(message) {
  errorBox.style.display = "none";
  successBox.textContent = message;
  successBox.style.display = "block";
}
function clearMessages() {
  errorBox.style.display = "none";
  successBox.style.display = "none";
  errorBox.textContent = "";
  successBox.textContent = "";
}
function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function allRecords() {
  return [...recordsByPlayer.values()].flat().sort((a, b) =>
    (a.playerName || "").localeCompare(b.playerName || "") || Number(a.day) - Number(b.day)
  );
}

playerFilter.innerHTML = '<option value="">All players</option>' +
  PLAYERS.map(p => `<option value="${p.id}">${safe(p.name)}</option>`).join("");

async function signIn() {
  clearMessages();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  if (!email || !password) {
    showError("Enter your administrator email and password.");
    return;
  }
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    showError("The email or password is incorrect, or this account is not enabled for administrator access.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in";
  }
}

loginBtn.addEventListener("click", signIn);
document.getElementById("adminPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") signIn();
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  clearMessages();
  await signOut(auth);
});

function render() {
  const records = allRecords();
  const selectedPlayer = playerFilter.value;
  const query = donorFilter.value.trim().toLowerCase();
  const filtered = records.filter(r =>
    (!selectedPlayer || r.playerId === selectedPlayer) &&
    (!query || `${r.name || ""} ${r.email || ""} ${r.phone || ""}`.toLowerCase().includes(query))
  );

  rows.innerHTML = filtered.map(r => `<tr>
    <td>${safe(r.playerName)}</td>
    <td>$${safe(r.day)}</td>
    <td>${safe(r.name)}</td>
    <td>${safe(r.email || r.phone || "—")}</td>
    <td>${safe(r.payment || "—")}</td>
    <td><span class="badge ${r.paid ? "badge-paid" : "badge-unpaid"}">${r.paid ? "Paid" : "Unpaid"}</span></td>
    <td>
      <button class="btn btn-light" data-paid="${safe(r.path)}" data-next="${!r.paid}">${r.paid ? "Mark unpaid" : "Mark paid"}</button>
      <button class="btn btn-danger" data-delete="${safe(r.path)}">Release</button>
    </td>
  </tr>`).join("");

  empty.style.display = filtered.length ? "none" : "block";
  const committed = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const paid = records.filter(r => r.paid).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  document.getElementById("adminReservationCount").textContent = records.length;
  document.getElementById("adminCommitted").textContent = `$${committed.toLocaleString()}`;
  document.getElementById("adminPaid").textContent = `$${paid.toLocaleString()}`;
}

rows.addEventListener("click", async event => {
  const paidButton = event.target.closest("[data-paid]");
  const deleteButton = event.target.closest("[data-delete]");
  clearMessages();
  try {
    if (paidButton) {
      await updateDoc(doc(db, paidButton.dataset.paid), { paid: paidButton.dataset.next === "true" });
      showSuccess("Payment status updated.");
    }
    if (deleteButton && confirm("Release this reserved day? The day will become available again.")) {
      await deleteDoc(doc(db, deleteButton.dataset.delete));
      showSuccess("The reservation was released.");
    }
  } catch (error) {
    console.error(error);
    showError("The action was denied. Confirm that the signed-in email matches the administrator email in Firestore rules.");
  }
});

playerFilter.addEventListener("change", render);
donorFilter.addEventListener("input", render);

function stopListeners() {
  unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  unsubscribeFunctions = [];
  recordsByPlayer.clear();
}

function startListeners() {
  stopListeners();
  PLAYERS.forEach(player => {
    const unsubscribe = onSnapshot(
      collection(db, "players", player.id, "reservations"),
      snapshot => {
        recordsByPlayer.set(player.id, snapshot.docs.map(d => ({
          ...d.data(),
          playerId: player.id,
          playerName: d.data().playerName || player.name,
          path: d.ref.path
        })));
        render();
      },
      error => {
        console.error(error);
        showError("Reservation data could not be loaded. Confirm the Firestore rules were published and the administrator email is correct.");
      }
    );
    unsubscribeFunctions.push(unsubscribe);
  });
}

onAuthStateChanged(auth, user => {
  authLoading.classList.add("hidden");
  clearMessages();
  if (user) {
    const email = (user.email || "").toLowerCase();
    if (!ADMIN_EMAILS.has(email)) {
      stopListeners();
      dashboard.classList.add("hidden");
      loginPanel.classList.remove("hidden");
      showError("This account is not authorized to access the administrator dashboard.");
      signOut(auth);
      return;
    }
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    document.getElementById("adminIdentity").textContent = user.email || "Administrator";
    startListeners();
  } else {
    stopListeners();
    dashboard.classList.add("hidden");
    loginPanel.classList.remove("hidden");
    document.getElementById("adminPassword").value = "";
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const records = allRecords();
  const columns = ["Player","Day","Amount","Donor","Phone","Email","Payment","Paid","Message"];
  const quote = value => `"${String(value ?? "").replaceAll('"','""')}"`;
  const csv = [columns.join(","), ...records.map(r => [
    r.playerName, r.day, r.amount, r.name, r.phone, r.email, r.payment,
    r.paid ? "Yes" : "No", r.message
  ].map(quote).join(","))].join("\n");
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  anchor.download = "tampa-dynamo-reservations.csv";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
});
