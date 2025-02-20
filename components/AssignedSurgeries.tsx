"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { generateSurgeryPDF } from "@/utils/pdfGenerator"

type Surgery = {
  id: string
  surgeryType: string
  date: Date
  estimatedDuration: number
  surgeonId: string
  neurophysiologistId: string
  roomId: string
  materials?: string[]
  hospital: string
  operatingRoom: string
}

const AssignedSurgeries: React.FC = () => {
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const { user } = useAuth()

  const materials = [
    "Electrodos",
    "Agujas EMG",
    "Gel conductor",
    "Cinta adhesiva",
    "Gasas estériles",
    "Alcohol",
    "Guantes",
    "Cables de conexión",
    "Amplificador de señales",
    "Monitor",
  ]

  useEffect(() => {
    const fetchSurgeries = async () => {
      if (!user) return
      setLoading(true)
      try {
        const surgeriesCollection = collection(db, "surgeries")
        const surgeriesQuery = query(
          surgeriesCollection,
          where("neurophysiologistId", "==", user.uid),
          where("date", ">=", new Date()),
        )
        const surgeriesSnapshot = await getDocs(surgeriesQuery)
        const surgeriesList = surgeriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        })) as Surgery[]
        setSurgeries(surgeriesList)
      } catch (error) {
        console.error("Error fetching surgeries:", error)
      }
      setLoading(false)
    }

    fetchSurgeries()
  }, [user])

  const handleMaterialSelection = (material: string) => {
    setSelectedMaterials((prev) => (prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]))
  }

  const handleMaterialSubmission = async () => {
    if (!selectedSurgery) return
    try {
      await updateDoc(doc(db, "surgeries", selectedSurgery.id), {
        materials: selectedMaterials,
      })
      setSurgeries((prev) =>
        prev.map((surgery) =>
          surgery.id === selectedSurgery.id ? { ...surgery, materials: selectedMaterials } : surgery,
        ),
      )
      setSelectedSurgery(null)
      setSelectedMaterials([])
    } catch (error) {
      console.error("Error updating surgery materials:", error)
    }
  }

  const handleGeneratePDF = (surgery: Surgery) => {
    const surgeryDetails = {
      type: surgery.surgeryType,
      date: surgery.date,
      duration: surgery.estimatedDuration,
      surgeon: "Dr. " + surgery.surgeonId, // You might want to fetch the actual surgeon name
      neurophysiologist: "Dr. " + surgery.neurophysiologistId, // You might want to fetch the actual neurophysiologist name
      hospital: surgery.hospital || "Hospital General",
      operatingRoom: surgery.operatingRoom || "Quirófano 1",
      materials: surgery.materials || [],
    }
    generateSurgeryPDF(surgeryDetails)
  }

  if (loading) {
    return <div>Cargando cirugías asignadas...</div>
  }

  if (surgeries.length === 0) {
    return <div>No hay cirugías asignadas en este momento.</div>
  }

  return (
    <div className="space-y-4">
      {surgeries.map((surgery) => (
        <Card key={surgery.id}>
          <CardHeader>
            <CardTitle>{surgery.surgeryType}</CardTitle>
            <CardDescription>
              Fecha: {surgery.date.toLocaleDateString()} - Duración estimada: {surgery.estimatedDuration} minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Quirófano: {surgery.roomId}</p>
            {surgery.materials && <p>Materiales seleccionados: {surgery.materials.join(", ")}</p>}
          </CardContent>
          <CardFooter className="justify-between">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setSelectedSurgery(surgery)}>
                  {surgery.materials ? "Editar Materiales" : "Seleccionar Materiales"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Seleccionar Materiales</DialogTitle>
                  <DialogDescription>Elija los materiales necesarios para la cirugía.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  {materials.map((material) => (
                    <div key={material} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={material}
                        checked={selectedMaterials.includes(material)}
                        onCheckedChange={() => handleMaterialSelection(material)}
                      />
                      <label htmlFor={material}>{material}</label>
                    </div>
                  ))}
                </ScrollArea>
                <DialogFooter>
                  <Button onClick={handleMaterialSubmission}>Guardar Selección</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={() => handleGeneratePDF(surgery)}>Generar Informe PDF</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export default AssignedSurgeries

