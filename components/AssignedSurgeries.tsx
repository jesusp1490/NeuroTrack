"use client"
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore"
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
import { notifyMaterialsUpdated } from "@/utils/notifications"
import { useToast } from "@/components/ui/use-toast"
import { surgeryTypes, additionalMaterials } from "@/lib/surgery-types"
import { SurgeryDetails } from "@/utils/pdfGenerator"
import { Surgery } from "@/types"
import { SurgeryMaterial } from "@/lib/surgery-types"

interface User {
  uid: string
}

interface AssignedSurgeriesProps {
  user?: User | null | undefined
  isSurgeon?: boolean | null | undefined
}

const AssignedSurgeries = ({ isSurgeon = false }: AssignedSurgeriesProps) => {
  const { user } = useAuth()
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const fetchSurgeries = async () => {
      if (!user) {
        console.log("No user found, skipping surgery fetch")
        return
      }
      setLoading(true)
      try {
        const surgeriesRef = collection(db, "surgeries")
        const fieldToQuery = isSurgeon ? "surgeonId" : "neurophysiologistId"

        console.log("Fetching surgeries with query:", {
          field: fieldToQuery,
          value: user.uid,
          isSurgeon,
        })

        const surgeriesQuery = query(
          surgeriesRef,
          where(fieldToQuery, "==", user.uid),
          where("status", "==", "scheduled"),
        )

        const surgeriesSnapshot = await getDocs(surgeriesQuery)

        const surgeriesWithDetails = await Promise.all(
          surgeriesSnapshot.docs.map(async (surgeryDoc) => {
            const surgeryData = surgeryDoc.data()
            const surgeryType = surgeryTypes.find((type) => type.id === surgeryData.surgeryType)
            if (!surgeryType) {
              console.error(`Invalid surgery type: ${surgeryData.surgeryType}`)
              return null
            }

            try {
              // Fetch all related data in parallel
              const [surgeonDoc, neurophysiologistDoc, hospitalDoc, shiftDoc] = await Promise.all([
                getDoc(doc(db, "users", surgeryData.surgeonId)),
                getDoc(doc(db, "users", surgeryData.neurophysiologistId)),
                getDoc(doc(db, "hospitals", surgeryData.hospitalId)),
                surgeryData.shiftId ? getDoc(doc(db, "shifts", surgeryData.shiftId)) : null,
              ])

              const missingDocs = []
              if (!surgeonDoc.exists()) missingDocs.push("surgeon")
              if (!neurophysiologistDoc.exists()) missingDocs.push("neurophysiologist")
              if (!hospitalDoc.exists()) missingDocs.push("hospital")

              // Get hospital data from shift if not directly available
              let hospitalData = hospitalDoc.exists() ? hospitalDoc.data() : null
              if (!hospitalData && shiftDoc?.exists()) {
                const shiftHospitalDoc = await getDoc(doc(db, "hospitals", shiftDoc.data().hospitalId))
                if (shiftHospitalDoc.exists()) {
                  hospitalData = shiftHospitalDoc.data()
                }
              }

              if (missingDocs.length > 0) {
                console.warn(`Missing related document(s) for surgery ${surgeryDoc.id}: ${missingDocs.join(", ")}`)
              }

              return {
                id: surgeryDoc.id,
                ...surgeryData,
                date: surgeryData.date.toDate(),
                surgeryType,
                surgeon: {
                  id: surgeryData.surgeonId,
                  name: surgeonDoc.exists() ? surgeonDoc.data()?.name : "Unknown",
                },
                neurophysiologist: {
                  id: surgeryData.neurophysiologistId,
                  name: neurophysiologistDoc.exists() ? neurophysiologistDoc.data()?.name : "Unknown",
                },
                hospital: {
                  id: hospitalData?.id || surgeryData.hospitalId,
                  name: hospitalData?.name || "Hospital no encontrado",
                },
                materials: surgeryData.materials || [],
                hasMissingData: missingDocs.length > 0,
              } as Surgery
            } catch (error) {
              console.error(`Error fetching details for surgery ${surgeryDoc.id}:`, error)
              return null
            }
          }),
        )

        const validSurgeries = surgeriesWithDetails.filter((surgery): surgery is Surgery => surgery !== null)
        console.log(`Processed ${validSurgeries.length} valid surgeries:`, validSurgeries)

        const sortedSurgeries = validSurgeries.sort((a, b) => a.date.getTime() - b.date.getTime())
        setSurgeries(sortedSurgeries)
      } catch (error) {
        console.error("Error fetching surgeries:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las cirugías asignadas",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSurgeries()
  }, [user, isSurgeon, toast])

  const handleMaterialSelection = (materialId: string) => {
    setSelectedMaterials((prevSelected) =>
      prevSelected.includes(materialId)
        ? prevSelected.filter((id) => id !== materialId)
        : [...prevSelected, materialId],
    )
  }

  const handleMaterialSubmission = async () => {
    if (!selectedSurgery) return

    try {
      const surgeryRef = doc(db, "surgeries", selectedSurgery.id)
      const materialsToUpdate = additionalMaterials.filter((material) => selectedMaterials.includes(material.id))

      await updateDoc(surgeryRef, { materials: materialsToUpdate })

      setSurgeries((prevSurgeries) =>
        prevSurgeries.map((surgery) =>
          surgery.id === selectedSurgery.id ? { ...surgery, materials: materialsToUpdate } : surgery,
        ),
      )

      setSelectedSurgery(null)
      setSelectedMaterials([])

      toast({
        title: "Éxito",
        description: "Materiales actualizados correctamente.",
      })

      await notifyMaterialsUpdated(selectedSurgery)
    } catch (error) {
      console.error("Error updating materials:", error)
      toast({
        title: "Error",
        description: "No se pudieron actualizar los materiales.",
        variant: "destructive",
      })
    }
  }

  const handleGeneratePDF = async (surgery: Surgery) => {
    const surgeryDetails: SurgeryDetails = {
      id: surgery.id,
      surgeryType: surgery.surgeryType,
      date: surgery.date,
      estimatedDuration: surgery.estimatedDuration,
      surgeon: surgery.surgeon,
      neurophysiologist: surgery.neurophysiologist,
      hospital: surgery.hospital,
      materials: surgery.materials,
    }

    generateSurgeryPDF(surgeryDetails)
  }

  if (!user) {
    return <div>Por favor, inicie sesión para ver las cirugías asignadas.</div>
  }

  if (loading) {
    return <div>Cargando cirugías asignadas... Por favor, espere.</div>
  }

  if (surgeries.length === 0) {
    return (
      <div>
        No hay cirugías {isSurgeon ? "programadas" : "asignadas"} en este momento. Si cree que esto es un error, por
        favor actualice la página o contacte al soporte técnico.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {surgeries.map((surgery) => {
        const surgeryType = surgery.surgeryType

        return (
          <Card key={surgery.id}>
            <CardHeader>
              <CardTitle>{surgeryType.name}</CardTitle>
              <CardDescription>
                Fecha: {surgery.date.toLocaleDateString()} - Duración estimada: {surgery.estimatedDuration} minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {surgery.hasMissingData && (
                <p className="text-yellow-500 mb-2">
                  Advertencia: Algunos datos relacionados con esta cirugía están incompletos.
                </p>
              )}
              <p>
                <strong>Cirujano:</strong> {surgery.surgeon.name}
              </p>
              <p>
                <strong>Neurofisiólogo:</strong> {surgery.neurophysiologist.name}
              </p>
              <p>
                <strong>Hospital:</strong> {surgery.hospital.name}
              </p>
              <div>
                <strong>Materiales:</strong>
                {surgery.materials.length > 0 ? (
                  <ul>
                    {surgery.materials.map((material: SurgeryMaterial) => (
                      <li key={material.id}>{material.name}</li>
                    ))}
                  </ul>
                ) : (
                  "No se han seleccionado materiales adicionales."
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              {!isSurgeon && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSurgery(surgery)
                        setSelectedMaterials(surgery.materials.map((m: SurgeryMaterial) => m.id))
                      }}
                    >
                      {surgery.materials?.length ? "Editar Materiales" : "Seleccionar Materiales"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Seleccionar Materiales Adicionales</DialogTitle>
                      <DialogDescription>
                        Seleccione los materiales adicionales necesarios para la cirugía.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] w-[300px]">
                      <div className="grid gap-2">
                        {additionalMaterials.map((material) => (
                          <div key={material.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={material.id}
                              checked={selectedMaterials.includes(material.id)}
                              onCheckedChange={() => handleMaterialSelection(material.id)}
                            />
                            <label
                              htmlFor={material.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {material.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <DialogFooter>
                      <Button type="submit" onClick={handleMaterialSubmission}>
                        Guardar Materiales
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Button onClick={() => handleGeneratePDF(surgery)}>Generar Informe PDF</Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

export default AssignedSurgeries

