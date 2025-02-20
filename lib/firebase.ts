import { initializeApp, getApps, type FirebaseOptions } from "firebase/app"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
let app
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig)
    console.log("Firebase initialized successfully")
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    throw error
  }
} else {
  app = getApps()[0]
}

export const db = getFirestore(app)

// Use emulator if running locally
if (process.env.NODE_ENV === "development") {
  connectFirestoreEmulator(db, "localhost", 8080)
}

