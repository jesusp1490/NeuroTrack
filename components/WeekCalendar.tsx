"use client"

import { useState, useEffect, useCallback } from "react"
import { addDays, format, startOfWeek, isSameDay, addWeeks, subWeeks, isWithinInterval, addMinutes } from "date-fns"
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
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { surgeryTypes } from "@/lib/surgery-types"
import { cn } from "@/lib/utils"

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

interface Surgery {
  id: string
  shiftId: string
  date: Date
  surgeonId: string
  neurophysiologistId: string
  surgeryType: string
  estimatedDuration: number
  status: string
}

const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`)

export function WeekCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [surgeryType, setSurgeryType] = useState<string | undefined>(undefined)

  const startDate = startOfWeek(currentDate, { locale: es })

  const fetchShiftsAndSurgeries = useCallback(async () => {
    if (!auth.currentUser) {
      console.log("User not authenticated")
      toast({
        title: "Error de autenticación",
        description: "Por favor, inicie sesión para ver los turnos disponibles.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("Fetching user data...")
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
      if (!userDoc.exists()) {
        throw new Error("User document does not exist")
      }
      const userData = userDoc.data()
      console.log("User data:", userData)

      if (userData.role !== "cirujano") {
        throw new Error("No tiene permisos para ver los turnos disponibles.")
      }

      const weekStart = startOfWeek(currentDate, { locale: es })
      const weekEnd = addDays(weekStart, 6)

      console.log("Fetching shifts...")
      const shiftsQuery = query(
        collection(db, "shifts"),
        where("date", ">=", Timestamp.fromDate(weekStart)),
        where("date", "<=", Timestamp.fromDate(weekEnd)),
      )

      console.log("Fetching surgeries...")
      const surgeriesQuery = query(
        collection(db, "surgeries"),
        where("date", ">=", Timestamp.fromDate(weekStart)),
        where("date", "<=", Timestamp.fromDate(weekEnd)),
      )

      const [shiftsSnapshot, surgeriesSnapshot] = await Promise.all([getDocs(shiftsQuery), getDocs(surgeriesQuery)])

      console.log("Shifts fetched:", shiftsSnapshot.size)
      console.log("Surgeries fetched:", surgeriesSnapshot.size)

      const shiftsData = await Promise.all(
        shiftsSnapshot.docs.map(async (shiftDoc) => {
          const shiftData = shiftDoc.data()
          const neurophysiologistDoc = await getDoc(doc(db, "users", shiftData.neurophysiologistId))
          const neurophysiologistData = neurophysiologistDoc.data()
          const hospitalDoc = await getDoc(doc(db, "hospitals", shiftData.hospitalId))
          const hospitalData = hospitalDoc.data()

          return {
            id: shiftDoc.id,
            ...shiftData,
            date: shiftData.date.toDate(),
            neurophysiologist: neurophysiologistData ? { name: neurophysiologistData.name } : undefined,
            hospital: hospitalData ? { name: hospitalData.name } : undefined,
          } as Shift
        }),
      )

      const surgeriesData = surgeriesSnapshot.docs.map((surgeryDoc) => ({
        id: surgeryDoc.id,
        ...surgeryDoc.data(),
        date: surgeryDoc.data().date.toDate(),
      })) as Surgery[]

      setShifts(shiftsData)
      setSurgeries(surgeriesData)
    } catch (error) {
      console.error("Error fetching shifts and surgeries:", error)
      if (error instanceof Error) {
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los turnos disponibles.",
        variant: "destructive",
      })
    }
  }, [currentDate, toast])

  useEffect(() => {
    fetchShiftsAndSurgeries()
  }, [fetchShiftsAndSurgeries])

  const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleNewSurgery = () => {
    setSelectedDate(new Date())
    setIsBookingDialogOpen(true)
  }

  const handleBookSurgery = async () => {
    if (!selectedShift || !user || !surgeryType || !estimatedDuration) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      // Verify user authentication
      if (!auth.currentUser) {
        throw new Error("Usuario no autenticado")
      }

      // Verify user role
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
      if (!userDoc.exists() || userDoc.data().role !== "cirujano") {
        throw new Error("No tiene permisos para programar cirugías")
      }

      // Check for overlapping surgeries
      const overlappingSurgeries = surgeries.filter(
        (surgery) =>
          isWithinInterval(selectedShift.date, {
            start: surgery.date,
            end: addDays(surgery.date, surgery.estimatedDuration / (24 * 60)),
          }) ||
          isWithinInterval(addDays(selectedShift.date, Number(estimatedDuration) / (24 * 60)), {
            start: surgery.date,
            end: addDays(surgery.date, surgery.estimatedDuration / (24 * 60)),
          }),
      )

      if (overlappingSurgeries.length > 0) {
        throw new Error("La cirugía se superpone con otra cirugía programada")
      }

      // Create surgery document
      const surgeryDate = new Date(selectedShift.date)
      surgeryDate.setHours(selectedShift.type === "morning" ? 8 : 14, 0, 0, 0)

      const surgeryData = {
        shiftId: selectedShift.id,
        hospitalId: selectedShift.hospitalId,
        date: Timestamp.fromDate(surgeryDate),
        surgeonId: auth.currentUser.uid,
        neurophysiologistId: selectedShift.neurophysiologistId,
        surgeryType: surgeryType,
        estimatedDuration: Number(estimatedDuration),
        additionalNotes,
        status: "scheduled",
        createdAt: Timestamp.now(),
      }

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

      setIsBookingDialogOpen(false)
      setSurgeryType(undefined)
      setEstimatedDuration("")
      setAdditionalNotes("")
      fetchShiftsAndSurgeries()
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
        description: "Este turno ya está reservado y no puede ser modificado.",
        variant: "destructive",
      })
      return
    }
    setSelectedShift(shift)
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
          const daySurgeries = surgeries.filter((surgery) => isSameDay(surgery.date, date))

          return (
            <div key={i} className="border-r">
              <div className="h-12 border-b p-2 text-sm font-medium sticky top-0 bg-background z-10">
                <div>{format(date, "EEEE", { locale: es })}</div>
                <div className="text-muted-foreground">{format(date, "d")}</div>
              </div>
              <div className="relative">
                {timeSlots.map((time) => (
                  <div key={time} className="h-12 border-b" />
                ))}
                {dayShifts.map((shift) => {
                  const shiftSurgery = daySurgeries.find((surgery) => surgery.shiftId === shift.id)
                  const isBooked = shift.booked || Boolean(shiftSurgery)

                  return (
                    <div
                      key={shift.id}
                      className={cn(
                        "absolute left-0 right-0 m-1 p-2 rounded-md text-sm",
                        isBooked
                          ? "bg-gray-200 text-gray-700 cursor-not-allowed"
                          : "bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200",
                      )}
                      style={{
                        top: `${(shift.type === "morning" ? 8 : 14) * 3}rem`,
                        height: "6rem",
                      }}
                      onClick={() => !isBooked && handleShiftSelect(shift)}
                    >
                      <div className="font-medium">{shift.type === "morning" ? "Mañana" : "Tarde"}</div>
                      {shift.neurophysiologist && <div className="text-xs">Dr. {shift.neurophysiologist.name}</div>}
                      {isBooked && <div className="text-xs font-semibold text-red-700">Cirugía Programada</div>}
                    </div>
                  )
                })}
                {daySurgeries
                  .filter((surgery) => {
                    const surgeryStartTime = new Date(surgery.date)
                    const surgeryStartHour = surgeryStartTime.getHours()
                    // Only show surgeries that start at valid shift times (8:00 or 14:00)
                    return surgeryStartHour === 8 || surgeryStartHour === 14
                  })
                  .map((surgery) => {
                    const surgeryStartTime = new Date(surgery.date)
                    const surgeryStartHour = surgeryStartTime.getHours()
                    const surgeryStartMinutes = surgeryStartTime.getMinutes()
                    const surgeryType = surgeryTypes.find((t) => t.id === surgery.surgeryType)

                    return (
                      <div
                        key={surgery.id}
                        className="absolute left-0 right-0 m-1 p-2 rounded-md text-sm bg-gray-300 text-gray-800 pointer-events-none"
                        style={{
                          top: `${(surgeryStartHour * 60 + surgeryStartMinutes) / 5}rem`,
                          height: `${surgery.estimatedDuration / 5}rem`,
                        }}
                      >
                        <div className="font-medium">Cirugía programada</div>
                        <div className="text-xs">{surgeryType?.name}</div>
                        <div className="text-xs">
                          {format(surgeryStartTime, "HH:mm")} -{" "}
                          {format(addMinutes(surgeryStartTime, surgery.estimatedDuration), "HH:mm")}
                        </div>
                      </div>
                    )
                  })}
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
              <Select
                onValueChange={(value) => {
                  setSurgeryType(value)
                }}
              >
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

