import * as admin from "firebase-admin"
import type { ServiceAccount } from "firebase-admin"
import { readFileSync } from "fs"
import path from "path"

const serviceAccountPath = path.join(process.cwd(), "config", "neurotrack-c6193-firebase-adminsdk-fbsvc-e8e690c796.json")
const serviceAccount: ServiceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"))

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

async function setupCollections() {
  // Create users collection
  const usersRef = db.collection("users")
  await usersRef.add({
    name: "Dr. John Doe",
    email: "john.doe@example.com",
    role: "Cirujano",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  await usersRef.add({
    name: "Dr. Jane Smith",
    email: "jane.smith@example.com",
    role: "Neurofisiologo",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // Create rooms collection
  const roomsRef = db.collection("rooms")
  await roomsRef.add({ name: "Operating Room 1" })
  await roomsRef.add({ name: "Operating Room 2" })
  await roomsRef.add({ name: "Operating Room 3" })

  // Create bookings collection
  const bookingsRef = db.collection("bookings")
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  await bookingsRef.add({
    roomId: "operating-room-1", // You might need to replace this with the actual ID
    date: admin.firestore.Timestamp.fromDate(tomorrow),
    surgeonId: "john-doe", // You might need to replace this with the actual ID
  })

  console.log("Collections created successfully!")
}

setupCollections().catch(console.error)

