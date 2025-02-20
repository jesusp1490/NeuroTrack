import { collection, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function setupRooms() {
  // First, check if we have any rooms
  const roomsRef = collection(db, "rooms")
  const snapshot = await getDocs(roomsRef)

  if (snapshot.empty) {
    // Add sample rooms
    const rooms = [{ name: "Operating Room 1" }, { name: "Operating Room 2" }, { name: "Operating Room 3" }]

    for (const room of rooms) {
      await addDoc(roomsRef, room)
    }

    console.log("Sample rooms have been added")
  }
}

