"use client"

import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { useState } from "react"

import * as React from "react"
import { addDays, format, startOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs, Timestamp, addDoc, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { surgeryTypes } from "@/lib/surgery-types"

interface Shift {
  id: string
  date: Date
  type: "morning" | "afternoon"
  neurophysiologistId: string
  hospitalId: string
  booked: boolean
  neurophysiologist?: {
    name: string
  }
  hospital?: {
    name: string
  }
}

interface NeurophysiologistData {
  name: string
  // Add other specific properties here
}

interface HospitalData {
  name: string
  // Add other specific properties here
}

const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`)

export function WeekCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [surgeryType, setSurgeryType] = useState<string>("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()

  const startDate = startOfWeek(currentDate, { locale: es })

  const fetchShifts = React.useCallback(async () => {
    if (!user) return

    try {
      const weekStart = startOfWeek(currentDate, { locale: es })
      const weekEnd = addDays(weekStart, 6)

      const shiftsQuery = query(
        collection(db, "shifts"),
        where("date", ">=", Timestamp.fromDate(weekStart)),
        where("date", "<=", Timestamp.fromDate(weekEnd)),
      )

      const shiftsSnapshot = await getDocs(shiftsQuery)
      const shiftsPromises = shiftsSnapshot.docs.map(async (shiftDoc: QueryDocumentSnapshot<DocumentData>) => {
        const shiftData = shiftDoc.data()

        // Fetch neurophysiologist data
        let neuroData = null
        if (shiftData.neurophysiologistId) {
          const neuroDoc = await getDoc(doc(db, "users", shiftData.neurophysiologistId))
          neuroData = neuroDoc.exists() ? (neuroDoc.data() as NeurophysiologistData) : null
        }

        // Fetch hospital data
        let hospitalData = null
        if (shiftData.hospitalId) {
          const hospitalDoc = await getDoc(doc(db, "hospitals", shiftData.hospitalId))
          hospitalData = hospitalDoc.exists() ? (hospitalDoc.data() as HospitalData) : null
        }

        return {
          id: shiftDoc.id,
          ...shiftData,
          date: shiftData.date.toDate(),
          neurophysiologist: neuroData ? { name: neuroData.name || "Nombre no disponible" } : undefined,
          hospital: hospitalData ? { name: hospitalData.name || "Hospital no disponible" } : undefined,
        }
      })

      const shiftsData = await Promise.all(shiftsPromises)
      setShifts(shiftsData as Shift[])
    } catch (error) {
      console.error("Error fetching shifts:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos disponibles",
        variant: "destructive",
      })
    }
  }, [currentDate, user, toast])

  React.useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsBookingDialogOpen(true)
  }

  const handleNewSurgery = () => {
    setSelectedDate(new Date())
    setIsBookingDialogOpen(true)
  }

  const handleBookSurgery = async () => {
    if (!selectedDate || !user || !surgeryType || !estimatedDuration) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
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
        throw new Error("No tiene permisos para realizar esta acción")
      }

      // Find available shift for the selected date
      const availableShift = shifts.find((shift) => isSameDay(shift.date, selectedDate) && !shift.booked)

      if (!availableShift) {
        throw new Error("No hay turnos disponibles para la fecha seleccionada")
      }

      // Double-check if the shift is still available
      const shiftDoc = await getDoc(doc(db, "shifts", availableShift.id))
      if (!shiftDoc.exists() || shiftDoc.data().booked) {
        throw new Error("El turno seleccionado ya no está disponible")
      }

      const surgeryData = {
        shiftId: availableShift.id,
        hospitalId: availableShift.hospitalId,
        date: Timestamp.fromDate(selectedDate),
        surgeonId: user.uid,
        neurophysiologistId: availableShift.neurophysiologistId,
        surgeryType,
        estimatedDuration: Number(estimatedDuration),
        additionalNotes,
        status: "scheduled",
        createdAt: Timestamp.now(),
      }

      const surgeryRef = await addDoc(collection(db, "surgeries"), surgeryData)

      // Update shift status
      await updateDoc(doc(db, "shifts", availableShift.id), {
        booked: true,
        surgeryId: surgeryRef.id,
      })

      toast({
        title: "Éxito",
        description: "Cirugía programada correctamente",
      })

      setIsBookingDialogOpen(false)
      setSurgeryType("")
      setEstimatedDuration("")
      setAdditionalNotes("")
      fetchShifts()
    } catch (error) {
      console.error("Error booking surgery:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al programar la cirugía",
        variant: "destructive",
      })
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
    setSelectedDate(shift.date)
    setIsBookingDialogOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{format(startDate, "MMMM yyyy", { locale: es })}</h2>
        </div>
        <Button className="gap-2" onClick={handleNewSurgery}>
          <Plus className="h-4 w-4" />
          Nueva cirugía
        </Button>
      </div>

      <div className="grid grid-cols-8 flex-1 overflow-auto">
        {/* Time column */}
        <div className="border-r sticky left-0 bg-background z-10">
          <div className="h-12 border-b" /> {/* Empty corner */}
          {timeSlots.map((time) => (
            <div key={time} className="h-12 border-b px-2 py-1 text-sm text-muted-foreground">
              {time}
            </div>
          ))}
        </div>

        {/* Days columns */}
        {Array.from({ length: 7 }).map((_, i) => {
          const date = addDays(startDate, i)
          const dayShifts = shifts.filter((shift) => isSameDay(shift.date, date))

          return (
            <div key={i} className="border-r">
              <div className="h-12 border-b p-2 text-sm font-medium sticky top-0 bg-background z-10">
                <div>{format(date, "EEEE", { locale: es })}</div>
                <div className="text-muted-foreground">{format(date, "d")}</div>
              </div>
              <div className="relative">
                {timeSlots.map((time) => (
                  <div key={time} className="h-12 border-b" onClick={() => handleDateClick(date)} />
                ))}
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`absolute left-0 right-0 m-1 p-2 rounded-md text-sm ${
                      shift.booked
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200"
                    }`}
                    style={{
                      top: `${(shift.type === "morning" ? 8 : 14) * 3}rem`,
                      height: "6rem",
                    }}
                    onClick={() => handleShiftSelect(shift)}
                  >
                    <div className="font-medium">{shift.type === "morning" ? "Mañana" : "Tarde"}</div>
                    {shift.neurophysiologist && <div className="text-xs">Dr. {shift.neurophysiologist.name}</div>}
                    {shift.hospital && <div className="text-xs truncate">{shift.hospital.name}</div>}
                    {shift.booked && <div className="text-xs font-semibold text-red-500">Reservado</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Programar Cirugía</DialogTitle>
            <DialogDescription>
              Complete los detalles de la cirugía para el{" "}
              {selectedDate && format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
            </DialogDescription>
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
                id="estimated-duration"
                type="number"
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
            <Button onClick={handleBookSurgery}>Programar Cirugía</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

