import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

async function testConnection() {
  try {
    console.log("Firebase Config:")
    console.log("  authDomain:", firebaseConfig.authDomain)
    console.log("  projectId:", firebaseConfig.projectId)
    console.log("  storageBucket:", firebaseConfig.storageBucket)
    console.log("  messagingSenderId:", firebaseConfig.messagingSenderId)
    console.log("  appId:", firebaseConfig.appId)
    console.log("  measurementId:", firebaseConfig.measurementId)

    const app = initializeApp(firebaseConfig)
    console.log("Firebase app initialized successfully")

    const db = getFirestore(app)
    console.log("Firestore instance created")

    const testCollection = collection(db, "test")
    console.log("Attempting to fetch documents from 'test' collection")

    const querySnapshot = await getDocs(testCollection)
    console.log(`Successfully fetched ${querySnapshot.size} documents from 'test' collection`)

    querySnapshot.forEach((doc) => {
      console.log(`Document ${doc.id}:`, doc.data())
    })

    console.log("Firebase connection test completed successfully")
  } catch (error) {
    console.error("Error during Firebase connection test:", error)
  }
}

testConnection()

