import * as admin from "firebase-admin"
import type { ServiceAccount } from "firebase-admin"

// Make sure this path is correct
import serviceAccount from "../config/neurotrack-c6193-firebase-adminsdk-fbsvc-e8e690c796.json"

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
})

const db = admin.firestore()

async function testAdminConnection() {
  try {
    console.log("Attempting to fetch documents from 'test' collection")

    const testCollection = db.collection("test")
    const querySnapshot = await testCollection.get()

    if (querySnapshot.empty) {
      console.log("'test' collection is empty. Adding a test document...")
      await testCollection.add({
        message: "Hello from Firebase!",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log("Test document added successfully.")

      // Fetch the documents again
      const updatedSnapshot = await testCollection.get()
      console.log(`Successfully fetched ${updatedSnapshot.size} documents from 'test' collection`)

      updatedSnapshot.forEach((doc) => {
        console.log(`Document ${doc.id}:`, doc.data())
      })
    } else {
      console.log(`Successfully fetched ${querySnapshot.size} documents from 'test' collection`)

      querySnapshot.forEach((doc) => {
        console.log(`Document ${doc.id}:`, doc.data())
      })
    }

    console.log("Firebase Admin connection test completed successfully")
  } catch (error) {
    console.error("Error during Firebase Admin connection test:", error)
  }
}

testAdminConnection()

