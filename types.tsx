import type { SurgeryType, SurgeryMaterial } from "@/lib/surgery-types"

export type Surgery = {
  id: string
  shiftId: string
  surgeonId: string
  neurophysiologistId: string
  type: string
  duration: number
  date: Date
  surgeryType: SurgeryType
  estimatedDuration: number
  additionalNotes: string
  status: string
  hospitalId: string
  materials: SurgeryMaterial[]
  surgeon: {
    id: string
    name: string
  }
  neurophysiologist: {
    id: string
    name: string
  }
  hospital: {
    id: string
    name: string
  }
  hasMissingData: boolean
}



