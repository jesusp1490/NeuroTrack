import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { SurgeryDetails } from "@/utils/pdfGenerator"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"

interface Notification {
  userId: string
  title: string
  message: string
  type: "surgery_booked" | "materials_updated" | "room_assigned"
  surgeryId?: string
  read: boolean
  createdAt: Date
}

export async function sendNotification(notification: Omit<Notification, "createdAt">) {
  try {
    const notificationsRef = collection(db, "notifications")
    await addDoc(notificationsRef, {
      ...notification,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error sending notification:", error)
  }
}

export async function notifySurgeryBooked(surgery: SurgeryDetails) {
  // Notify surgeon
  await sendNotification({
    userId: surgery.surgeon.id,
    title: "Cirugía Programada",
    message: `Su cirugía ha sido programada para el ${surgery.date.toLocaleDateString()}`,
    type: "surgery_booked",
    surgeryId: surgery.id,
    read: false,
  })

  // Notify neurophysiologist
  await sendNotification({
    userId: surgery.neurophysiologist.id,
    title: "Nueva Cirugía Asignada",
    message: `Se le ha asignado una nueva cirugía para el ${surgery.date.toLocaleDateString()}`,
    type: "surgery_booked",
    surgeryId: surgery.id,
    read: false,
  })

  // Notify administrative staff
  const adminNotification = {
    title: "Nueva Cirugía Requiere Asignación de Quirófano",
    message: `Una nueva cirugía ha sido programada y requiere asignación de quirófano`,
    type: "surgery_booked" as const,
    surgeryId: surgery.id,
    read: false,
  }

  const adminQuery = query(
    collection(db, "users"),
    where("role", "==", "administrativo"),
    where("hospitalId", "==", surgery.hospital.id),
  )

  const adminSnapshot = await getDocs(adminQuery)

  adminSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
    void sendNotification({
      ...adminNotification,
      userId: doc.id,
    })
  })
}

export async function notifyMaterialsUpdated(surgery: SurgeryDetails) {
  // Notify administrative staff
  const adminNotification = {
    title: "Materiales Actualizados",
    message: `Los materiales para la cirugía han sido actualizados por el neurofisiólogo`,
    type: "materials_updated" as const,
    surgeryId: surgery.id,
    read: false,
  }

  const adminQuery = query(
    collection(db, "users"),
    where("role", "==", "administrativo"),
    where("hospitalId", "==", surgery.hospital.id),
  )

  const adminSnapshot = await getDocs(adminQuery)

  adminSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
    void sendNotification({
      ...adminNotification,
      userId: doc.id,
    })
  })
}

export async function notifyRoomAssigned(surgery: SurgeryDetails) {
  // Notify surgeon
  await sendNotification({
    userId: surgery.surgeon.id,
    title: "Quirófano Asignado",
    message: `Se ha asignado el quirófano ${surgery.room} para su cirugía`,
    type: "room_assigned",
    surgeryId: surgery.id,
    read: false,
  })

  // Notify neurophysiologist
  await sendNotification({
    userId: surgery.neurophysiologist.id,
    title: "Quirófano Asignado",
    message: `Se ha asignado el quirófano ${surgery.room} para la cirugía`,
    type: "room_assigned",
    surgeryId: surgery.id,
    read: false,
  })
}

