import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read and parse the service account key file
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "config",
  "neurotrack-c6193-firebase-adminsdk-fbsvc-e8e690c796.json",
)
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"))

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
})

const db = getFirestore()

async function initializeHospitals() {
  const hospitals = [
    {
      name: "Hospital Universitario La Paz",
      picture: "https://example.com/la-paz.jpg",
    },
    {
      name: "Hospital Clínico San Carlos",
      picture: "https://example.com/san-carlos.jpg",
    },
    {
      name: "Hospital Universitario 12 de Octubre",
      picture: "https://example.com/12-de-octubre.jpg",
    },
  ]

  const hospitalsCollection = db.collection("hospitals")

  for (const hospital of hospitals) {
    try {
      const docRef = await hospitalsCollection.add(hospital)
      console.log(`Hospital added with ID: ${docRef.id}`)
    } catch (error) {
      console.error("Error adding hospital: ", error)
    }
  }
}

initializeHospitals()
  .then(() => {
    console.log("Hospital initialization completed successfully.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Error during hospital initialization:", error)
    process.exit(1)
  })

