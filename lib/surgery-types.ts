export interface SurgeryMaterial {
  id: string
  name: string
  category: string
  required: boolean
}

export interface SurgeryType {
  id: string
  name: string
  description: string
  estimatedDuration: number
  defaultMaterials: SurgeryMaterial[]
}

export const surgeryTypes: SurgeryType[] = [
  {
    id: "tipo-1",
    name: "Tipo 1",
    description: "Cirugía de columna cervical",
    estimatedDuration: 120,
    defaultMaterials: [
      { id: "m1", name: "Electrodos EMG", category: "Monitorización", required: true },
      { id: "m2", name: "Agujas monopolares", category: "Monitorización", required: true },
      { id: "m3", name: "Gel conductor", category: "Consumibles", required: true },
      { id: "m4", name: "Gasas estériles", category: "Consumibles", required: true },
    ],
  },
  {
    id: "tipo-2",
    name: "Tipo 2",
    description: "Cirugía de columna lumbar",
    estimatedDuration: 180,
    defaultMaterials: [
      { id: "m1", name: "Electrodos EMG", category: "Monitorización", required: true },
      { id: "m2", name: "Agujas monopolares", category: "Monitorización", required: true },
      { id: "m5", name: "Electrodos adhesivos", category: "Monitorización", required: true },
      { id: "m3", name: "Gel conductor", category: "Consumibles", required: true },
      { id: "m4", name: "Gasas estériles", category: "Consumibles", required: true },
    ],
  },
  {
    id: "tipo-3",
    name: "Tipo 3",
    description: "Cirugía intracraneal",
    estimatedDuration: 240,
    defaultMaterials: [
      { id: "m6", name: "Electrodos corticales", category: "Monitorización", required: true },
      { id: "m7", name: "Electrodos subdurales", category: "Monitorización", required: true },
      { id: "m8", name: "Sistema de fijación", category: "Equipamiento", required: true },
      { id: "m3", name: "Gel conductor", category: "Consumibles", required: true },
      { id: "m4", name: "Gasas estériles", category: "Consumibles", required: true },
    ],
  },
]

export const additionalMaterials: SurgeryMaterial[] = [
  { id: "m9", name: "Cable de extensión", category: "Equipamiento", required: false },
  { id: "m10", name: "Electrodos de repuesto", category: "Monitorización", required: false },
  { id: "m11", name: "Cinta adhesiva", category: "Consumibles", required: false },
  { id: "m12", name: "Alcohol", category: "Consumibles", required: false },
]

