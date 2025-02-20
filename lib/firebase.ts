import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getMessaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyBViDd1cL9j_E2rplj-7G_IjTqfCpvInBk",
  authDomain: "neurotrack-c6193.firebaseapp.com",
  projectId: "neurotrack-c6193",
  storageBucket: "neurotrack-c6193.firebasestorage.app",
  messagingSenderId: "348389502242",
  appId: "1:348389502242:web:c736c50ad280573220897b",
  measurementId: "G-X4WJRRPBST"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const messaging = getMessaging(app)