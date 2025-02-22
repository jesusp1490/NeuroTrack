import * as functions from "firebase-functions/v2"
import * as admin from "firebase-admin"

admin.initializeApp()

interface Booking {
  date: admin.firestore.Timestamp
  neurophysiologistIds: string[]
  requiredNeurophysiologists: number
}

interface AssignmentCounts {
  [key: string]: number
}

export const optimizeNeurophysiologistAssignment = functions.firestore.onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const snap = event.data
    if (!snap) {
      console.log("No data associated with the event")
      return
    }
    const booking = snap.data() as Booking
    const db = admin.firestore()

    // Get all available neurophysiologists for the booking date
    const shiftsSnapshot = await db.collection("shifts").where("date", "==", booking.date).get()

    const availableNeurophysiologists = shiftsSnapshot.docs.map((doc) => doc.data().neurophysiologistId as string)

    // Get all bookings for the same date
    const bookingsSnapshot = await db.collection("bookings").where("date", "==", booking.date).get()

    // Count current assignments for each neurophysiologist
    const assignmentCounts: AssignmentCounts = {}
    bookingsSnapshot.docs.forEach((doc) => {
      const bookingData = doc.data() as Booking
      bookingData.neurophysiologistIds.forEach((id: string) => {
        assignmentCounts[id] = (assignmentCounts[id] || 0) + 1
      })
    })

    // Sort neurophysiologists by assignment count
    const sortedNeurophysiologists = availableNeurophysiologists.sort(
      (a, b) => (assignmentCounts[a] || 0) - (assignmentCounts[b] || 0),
    )

    // Assign the required number of neurophysiologists
    const assignedNeurophysiologists = sortedNeurophysiologists.slice(0, booking.requiredNeurophysiologists)

    // Update the booking with assigned neurophysiologists
    await snap.ref.update({ neurophysiologistIds: assignedNeurophysiologists })
  },
)

