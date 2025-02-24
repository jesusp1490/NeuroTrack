"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { format, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { collection, query, where, getDocs, addDoc, Timestamp, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, User, Hospital } from "lucide-react"
import { surgeryTypes } from "@/lib/surgery-types"
import { serverTimestamp } from "firebase/firestore"

interface ShiftNeurophysiologist {
  name: string
}

interface ShiftHospital {
  name: string
}

interface Shift {
  id: string
  date: Date
  type: "morning" | "afternoon"
  neurophysiologistId: string
  hospitalId: string
  booked: boolean
  neurophysiologist?: ShiftNeurophysiologist
  hospital?: ShiftHospital
}

const OperatingRoomCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([])
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState<boolean>(false)
  const [surgeryType, setSurgeryType] = useState<string | undefined>(undefined)
  const [estimatedDuration, setEstimatedDuration] = useState<string>("")
  const [additionalNotes, setAdditionalNotes] = useState<string>("")
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchAvailability = useCallback(async () => {
    if (!user) {
      console.log("User not authenticated")
      toast({
        title: "Error de autenticación",
        description: "Por favor, inicie sesión para ver los turnos disponibles.",
        variant: "destructive",
      })
      return
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        throw new Error("Usuario no encontrado")
      }
      const userData = userDoc.data()
      if (userData.role !== "cirujano") {
        throw new Error("Acceso no autorizado. Se requiere rol de cirujano.")
      }

      const start = startOfDay(selectedDate)
      const end = endOfDay(selectedDate)

      const shiftsQuery = query(
        collection(db, "shifts"),
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
      )

      const shiftsSnapshot = await getDocs(shiftsQuery)
      const shiftsPromises = shiftsSnapshot.docs.map(async (shiftDoc) => {
        const shiftData = shiftDoc.data()

        try {
          // Fetch neurophysiologist data
          let neurophysiologistData = null
          if (shiftData.neurophysiologistId) {
            const neurophysiologistDoc = await getDoc(doc(db, "users", shiftData.neurophysiologistId))
            if (neurophysiologistDoc.exists()) {
              neurophysiologistData = neurophysiologistDoc.data()
            }
          }

          // Fetch hospital data
          let hospitalData = null
          if (shiftData.hospitalId) {
            const hospitalDoc = await getDoc(doc(db, "hospitals", shiftData.hospitalId))
            if (hospitalDoc.exists()) {
              hospitalData = hospitalDoc.data()
            }
          }

          // Check if shift is booked
          const bookingsQuery = query(
            collection(db, "surgeries"),
            where("shiftId", "==", shiftDoc.id),
            where("status", "==", "scheduled"),
          )
          const bookingsSnapshot = await getDocs(bookingsQuery)
          const isBooked = !bookingsSnapshot.empty

          const processedShift = {
            id: shiftDoc.id,
            date: shiftData.date.toDate(),
            type: shiftData.type,
            neurophysiologistId: shiftData.neurophysiologistId,
            hospitalId: shiftData.hospitalId,
            booked: isBooked,
            ...(neurophysiologistData && {
              neurophysiologist: {
                name: neurophysiologistData.name || "Nombre no disponible",
              },
            }),
            ...(hospitalData && {
              hospital: {
                name: hospitalData.name || "Hospital no disponible",
              },
            }),
          }

          return processedShift
        } catch (error) {
          console.error(`Error processing shift ${shiftDoc.id}:`, error)
          return null
        }
      })

      const shiftsResults = await Promise.all(shiftsPromises)
      const validShifts = shiftsResults.filter(
        (shift): shift is Shift =>
          shift !== null && shift.neurophysiologist !== undefined && shift.hospital !== undefined,
      )
      setAvailableShifts(validShifts as Shift[])
    } catch (error) {
      console.error("Error fetching shifts:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los turnos disponibles. Verifique sus permisos.",
        variant: "destructive",
      })
      setAvailableShifts([])
    }
  }, [selectedDate, user, toast])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setSelectedShift(null)
    }
  }

  const handleShiftSelect = (shift: Shift) => {
    if (shift.booked) {
      toast({
        title: "Turno no disponible",
        description: "Este turno ya ha sido reservado.",
        variant: "destructive",
      })
      return
    }
    setSelectedShift(shift)
    setIsBookingDialogOpen(true)
  }

  const handleBookShift = async () => {
    if (!selectedShift || !user || !surgeryType || !estimatedDuration) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    try {
      // Verify user and permissions
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        throw new Error("No se encontró el usuario en la base de datos")
      }
      const userData = userDoc.data()
      if (userData.role !== "cirujano") {
        throw new Error("No tiene permisos para realizar esta acción. Se requiere rol de cirujano.")
      }

      // Verify surgery type exists
      const selectedSurgeryType = surgeryTypes.find((type) => type.id === surgeryType)
      if (!selectedSurgeryType) {
        throw new Error("Tipo de cirugía inválido")
      }

      // Fetch the shift data to ensure we have the correct hospitalId
      const shiftDoc = await getDoc(doc(db, "shifts", selectedShift.id))
      if (!shiftDoc.exists()) {
        throw new Error("El turno seleccionado ya no existe")
      }
      const shiftData = shiftDoc.data()

      // Try to get hospitalId from various sources
      let hospitalId = shiftData.hospitalId || selectedShift.hospitalId

      if (!hospitalId) {
        // If hospitalId is still not found, try to get it from the neurophysiologist's data
        if (shiftData.neurophysiologistId) {
          const neuroDoc = await getDoc(doc(db, "users", shiftData.neurophysiologistId))
          if (neuroDoc.exists()) {
            hospitalId = neuroDoc.data().hospitalId
          }
        }
      }

      if (!hospitalId) {
        console.error("Shift data:", shiftData)
        console.error("Selected shift:", selectedShift)
        throw new Error("No se pudo determinar el hospital para este turno. Por favor, contacte al administrador.")
      }

      // Create surgery document
      const surgeryData = {
        shiftId: selectedShift.id,
        hospitalId: hospitalId,
        date: Timestamp.fromDate(selectedDate),
        surgeonId: user.uid,
        neurophysiologistId: shiftData.neurophysiologistId || selectedShift.neurophysiologistId,
        surgeryType: surgeryType,
        estimatedDuration: Number(estimatedDuration),
        additionalNotes: additionalNotes,
        status: "scheduled",
        createdAt: serverTimestamp(),
        materials: selectedSurgeryType.defaultMaterials,
      }

      console.log("Attempting to create surgery with data:", surgeryData)

      const surgeryRef = await addDoc(collection(db, "surgeries"), surgeryData)

      // Update shift status
      await updateDoc(doc(db, "shifts", selectedShift.id), {
        booked: true,
        surgeryId: surgeryRef.id,
      })

      toast({
        title: "Éxito",
        description: "Cirugía programada correctamente",
      })

      // Reset form
      setIsBookingDialogOpen(false)
      setSelectedShift(null)
      setSurgeryType(undefined)
      setEstimatedDuration("")
      setAdditionalNotes("")

      // Refresh available shifts
      await fetchAvailability()
    } catch (error) {
      console.error("Error booking surgery:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al programar la cirugía",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-[400px,1fr] gap-6">
        <Card className="bg-background">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={es}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">
              Turnos disponibles para el {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </h3>
            <div className="grid gap-4">
              {availableShifts.length > 0 ? (
                availableShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      shift.booked
                        ? "bg-gray-50 border-gray-200 cursor-not-allowed"
                        : "bg-white border-gray-200 hover:border-primary cursor-pointer"
                    }`}
                    onClick={() => !shift.booked && handleShiftSelect(shift)}
                  >
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{shift.type === "morning" ? "Mañana" : "Tarde"}</span>
                      </div>
                      {shift.neurophysiologist && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4" />
                          <span>Dr. {shift.neurophysiologist.name}</span>
                        </div>
                      )}
                      {shift.hospital && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hospital className="h-4 w-4" />
                          <span>{shift.hospital.name}</span>
                        </div>
                      )}
                      {shift.booked && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No disponible
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No hay turnos disponibles para este día</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Programar Cirugía</DialogTitle>
            <DialogDescription>Complete los detalles de la cirugía para el turno seleccionado</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="surgery-type">Tipo de Cirugía</Label>
              <Select value={surgeryType} onValueChange={setSurgeryType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el tipo de cirugía" />
                </SelectTrigger>
                <SelectContent>
                  {surgeryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.name}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimated-duration">Duración Estimada (minutos)</Label>
              <Input
                type="number"
                id="estimated-duration"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="additional-notes">Notas Adicionales</Label>
              <Textarea
                id="additional-notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Agregue cualquier información adicional relevante"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBookShift}>Programar Cirugía</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OperatingRoomCalendar

