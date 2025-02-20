import { useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

type Material = {
  id: string
  name: string
}

type MaterialSelectionProps = {
  surgeryId: string
  onClose: () => void
}

const availableMaterials: Material[] = [
  { id: "1", name: "Scalpel" },
  { id: "2", name: "Forceps" },
  { id: "3", name: "Retractor" },
  { id: "4", name: "Suction" },
  { id: "5", name: "Electrocautery" },
  // Add more materials as needed
]

export default function MaterialSelection({ surgeryId, onClose }: MaterialSelectionProps) {
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId],
    )
  }

  const handleSubmit = async () => {
    try {
      await updateDoc(doc(db, "surgeries", surgeryId), {
        materials: selectedMaterials,
      })
      alert("Materials selected successfully!")
      onClose()
    } catch (error) {
      console.error("Error selecting materials:", error)
      alert("Failed to select materials. Please try again.")
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Select Materials</h3>
      <div className="space-y-2">
        {availableMaterials.map((material) => (
          <label key={material.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedMaterials.includes(material.id)}
              onChange={() => handleMaterialToggle(material.id)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>{material.name}</span>
          </label>
        ))}
      </div>
      <div className="mt-6 flex justify-end space-x-4">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Submit
        </button>
      </div>
    </div>
  )
}

