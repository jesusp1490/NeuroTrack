"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import MaterialSelection from "./MaterialSelection"
import { generateSurgeryPDF } from "@/utils/pdfGenerator"

type Surgery = {
  id: string
  shiftId: string
  surgeonId: string
  neurophysiologistId: string
  type: string
  duration: number
  date: Date
}

type AssignedSurgeriesProps = {
  neurophysiologistId: string
}

export default function AssignedSurgeries({ neurophysiologistId }: AssignedSurgeriesProps) {
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssignedSurgeries = async () => {
      const surgeriesQuery = query(
        collection(db, "surgeries"),
        where("neurophysiologistId", "==", neurophysiologistId),
        where("date", ">=", new Date()),
      )
      const surgeriesSnapshot = await getDocs(surgeriesQuery)
      const surgeriesData = surgeriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Surgery[]
      setSurgeries(surgeriesData)
    }
    fetchAssignedSurgeries()
  }, [neurophysiologistId])

  const handleSelectMaterials = (surgeryId: string) => {
    setSelectedSurgeryId(surgeryId)
  }

  const handleCloseMaterialSelection = () => {
    setSelectedSurgeryId(null)
  }

  const handleGeneratePDF = (surgery: Surgery) => {
    // In a real application, you would fetch additional details like hospital and operating room
    const surgeryDetails = {
      ...surgery,
      surgeon: "Dr. John Doe", // This should be fetched from the database
      neurophysiologist: "Dr. Jane Smith", // This should be fetched from the database
      hospital: "General Hospital",
      operatingRoom: "OR 1",
      materials: ["Scalpel", "Forceps", "Retractor"], // This should be fetched from the database
    }
    generateSurgeryPDF(surgeryDetails)
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Assigned Surgeries</h3>
      {surgeries.length === 0 ? (
        <p>No assigned surgeries.</p>
      ) : (
        <ul className="space-y-4">
          {surgeries.map((surgery) => (
            <li key={surgery.id} className="bg-white shadow rounded-lg p-4">
              <p className="font-semibold">{surgery.type}</p>
              <p>Date: {surgery.date.toDateString()}</p>
              <p>Duration: {surgery.duration} minutes</p>
              <div className="mt-2 space-x-2">
                <button
                  onClick={() => handleSelectMaterials(surgery.id)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Select Materials
                </button>
                <button
                  onClick={() => handleGeneratePDF(surgery)}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Generate PDF
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selectedSurgeryId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <MaterialSelection surgeryId={selectedSurgeryId} onClose={handleCloseMaterialSelection} />
          </div>
        </div>
      )}
    </div>
  )
}

