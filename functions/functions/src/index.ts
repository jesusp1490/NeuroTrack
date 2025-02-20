import * as functions from "firebase-functions/v2"
import * as admin from "firebase-admin"

admin.initializeApp()

export const setUserRole = functions.auth.user().onCreate(async (user: functions.auth.UserRecord) => {
  try {
    // Get the user's data from Firestore
    const userDoc = await admin.firestore().collection("users").doc(user.uid).get()
    const userData = userDoc.data()

    if (userData && userData.role) {
      // Set custom claims based on the user's role
      await admin.auth().setCustomUserClaims(user.uid, { role: userData.role })
      console.log(`Custom claims set for user ${user.uid}`)
    } else {
      console.log(`No role found for user ${user.uid}`)
    }
  } catch (error) {
    console.error("Error setting custom claims:", error)
  }
})

// Add more functions as needed

