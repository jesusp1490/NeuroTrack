import { db } from "../lib/firebase"
import { collection, getDocs, addDoc } from "firebase/firestore"

async function initializeRooms() {
  console.log("Checking for existing rooms...")

  try {
    // First, check if we have any rooms
    const roomsRef = collection(db, "rooms")
    const snapshot = await getDocs(roomsRef)

    if (snapshot.empty) {
      console.log("No rooms found. Creating sample rooms...")
      // Add sample rooms
      const rooms = [{ name: "Operating Room 1" }, { name: "Operating Room 2" }, { name: "Operating Room 3" }]

      for (const room of rooms) {
        try {
          const docRef = await addDoc(roomsRef, room)
          console.log(`Created room: ${room.name} with ID: ${docRef.id}`)
        } catch (error) {
          console.error(`Error creating room ${room.name}:`, error)
        }
      }

      console.log("Sample rooms have been added successfully!")
    } else {
      console.log(`Found ${snapshot.size} existing rooms. No need to create new ones.`)
    }
  } catch (error) {
    console.error("Error initializing rooms:", error)
  }
}

// Run the initialization
initializeRooms().catch(console.error)

