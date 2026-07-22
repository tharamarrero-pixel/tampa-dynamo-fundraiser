import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7wtcDKujRBTvq6epb4UsN5AqG7wS2ZXQ",
  authDomain: "tampa-dynamo-challenge.firebaseapp.com",
  projectId: "tampa-dynamo-challenge",
  storageBucket: "tampa-dynamo-challenge.firebasestorage.app",
  messagingSenderId: "452011701884",
  appId: "1:452011701884:web:b5e6d818fde6077228fbf9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
