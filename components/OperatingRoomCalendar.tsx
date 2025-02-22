"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { format, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { collection, query, where, getDocs, addDoc, Timestamp, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar-full"
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
import { NavButtons } from "@/components/ui/nav-buttons"
import { serverTimestamp } from "firebase/firestore"
import { surgeryTypes } from "@/lib/surgery-types"

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  operatingRoom: string
  neurophysiologistId: string
  booked: boolean
  surgeryId: string | null
  type: "morning" | "afternoon"
  neurophysiologist?: {
    name: string
  }
}

const OperatingRoomCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([])
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState<boolean>(false)
  const [surgeryType, setSurgeryType] = useState<string | undefined>(undefined)
  const [estimatedDuration, setEstimatedDuration] = useState<string>("")
  const [additionalNotes, setAdditionalNotes] = useState<string>("")
  const [selectedHospital] = useState<string>("Hospital ABC") // Default value
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchAvailability = useCallback(async () => {
    try {
      const start = startOfDay(selectedDate)
      const end = endOfDay(selectedDate)

      const shiftsQuery = query(
        collection(db, "shifts"),
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
      )

      const shiftsSnapshot = await getDocs(shiftsQuery)
      const shiftsWithNeurophysiologists = await Promise.all(
        shiftsSnapshot.docs.map(async (shiftDoc) => {
          const shiftData = shiftDoc.data()
          // Fetch neurophysiologist data
          const neurophysiologistDoc = await getDoc(doc(db, "users", shiftData.neurophysiologistId))
          const neurophysiologistData = neurophysiologistDoc.data()

          // Fetch booking status
          const bookingsQuery = query(
            collection(db, "surgeries"),
            where("shiftId", "==", shiftDoc.id),
            where("status", "==", "scheduled"),
          )
          const bookingsSnapshot = await getDocs(bookingsQuery)
          const isBooked = !bookingsSnapshot.empty

          return {
            id: shiftDoc.id,
            ...shiftData,
            date: format(shiftData.date.toDate(), "yyyy-MM-dd"),
            neurophysiologist: neurophysiologistDoc.exists()
              ? { name: neurophysiologistData?.name || "Nombre no disponible" }
              : { name: "Neurofisiólogo no encontrado" },
            booked: isBooked,
          }
        }),
      )

      setAvailableShifts(shiftsWithNeurophysiologists as Shift[])
    } catch (error) {
      console.error("Error fetching shifts:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos disponibles.",
        variant: "destructive",
      })
    }
  }, [selectedDate, toast])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedShift(null)
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

  const handleCloseDialog = () => {
    setIsBookingDialogOpen(false)
    setSelectedShift(null)
    setSurgeryType(undefined)
    setEstimatedDuration("")
    setAdditionalNotes("")
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
      // Check user authentication
      if (!user.uid) {
        throw new Error("User is not authenticated")
      }

      // Fetch user data to verify role
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        throw new Error("User document not found")
      }
      const userData = userDoc.data()
      console.log("User data:", userData)

      if (userData.role !== "cirujano") {
        throw new Error(`User does not have cirujano role. Current role: ${userData.role}`)
      }

      const selectedSurgeryType = surgeryTypes.find((type) => type.id === surgeryType)
      if (!selectedSurgeryType) {
        throw new Error("Invalid surgery type")
      }

      // Verify that the neurophysiologist exists
      const neurophysiologistDoc = await getDoc(doc(db, "users", selectedShift.neurophysiologistId))
      if (!neurophysiologistDoc.exists()) {
        throw new Error("Neurophysiologist not found")
      }

      // Verify that the hospital exists
      const hospitalDoc = await getDoc(doc(db, "hospitals", selectedHospital))
      if (!hospitalDoc.exists()) {
        throw new Error("Hospital not found")
      }

      // Check if the shift is already booked
      const bookingsQuery = query(
        collection(db, "surgeries"),
        where("shiftId", "==", selectedShift.id),
        where("status", "==", "scheduled"),
      )
      const bookingsSnapshot = await getDocs(bookingsQuery)
      if (!bookingsSnapshot.empty) {
        throw new Error("This shift has already been booked")
      }

      const surgeryData = {
        shiftId: selectedShift.id,
        hospitalId: selectedHospital,
        date: Timestamp.fromDate(selectedDate),
        surgeonId: user.uid,
        neurophysiologistId: selectedShift.neurophysiologistId,
        surgeryType: surgeryType,
        estimatedDuration: Number(estimatedDuration),
        additionalNotes: additionalNotes || "",
        status: "scheduled",
        createdAt: serverTimestamp(),
        materials: selectedSurgeryType.defaultMaterials,
      }

      console.log("Attempting to create surgery with data:", surgeryData)

      const surgeryRef = await addDoc(collection(db, "surgeries"), surgeryData)

      console.log("Surgery created successfully with ID:", surgeryRef.id)

      await updateDoc(doc(db, "shifts", selectedShift.id), {
        booked: true,
        surgeryId: surgeryRef.id,
      })

      toast({
        title: "Éxito",
        description: "Reserva realizada correctamente",
      })

      setSelectedShift(null)
      setSurgeryType("")
      setEstimatedDuration("")
      setAdditionalNotes("")

      await fetchAvailability()
    } catch (error: unknown) {
      console.error("Error booking surgery:", error)
      let errorMessage = "Error desconocido al realizar la reserva."
      if (error instanceof Error) {
        errorMessage = error.message
      }
      toast({
        title: "Error",
        description: `Error al realizar la reserva: ${errorMessage}`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <NavButtons />
      <div className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date: Date | undefined) => date && handleDateSelect(date)}
          locale={es}
        />

        <div>
          <h2 className="text-lg font-semibold">
            Turnos disponibles para el {format(selectedDate, "dd 'de' MMMM yyyy", { locale: es })}
          </h2>
          {availableShifts.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {availableShifts.map((shift) => (
                <li
                  key={shift.id}
                  className={`p-3 rounded-md cursor-pointer ${
                    shift.booked ? "bg-gray-200 text-gray-500" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  onClick={() => handleShiftSelect(shift)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {shift.type === "morning" ? "Mañana" : "Tarde"} ({shift.startTime} - {shift.endTime})
                      </span>
                      <p className="text-sm text-muted-foreground">Dr. {shift.neurophysiologist?.name}</p>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {shift.operatingRoom} - {shift.booked ? "Reservado" : "Disponible"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay turnos disponibles para este día.</p>
          )}
        </div>

        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirmar Reserva</DialogTitle>
              <DialogDescription>¿Está seguro de que desea reservar el turno seleccionado?</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="surgery-type" className="text-right">
                  Tipo de Cirugía
                </Label>
                <Select value={surgeryType} onValueChange={setSurgeryType}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione el tipo de cirugía" />
                  </SelectTrigger>
                  <SelectContent>
                    {surgeryTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div>
                          <div>{type.name}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="estimated-duration" className="text-right">
                  Duración Estimada (minutos)
                </Label>
                <Input
                  type="number"
                  id="estimated-duration"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="additional-notes" className="text-right mt-2">
                  Notas Adicionales
                </Label>
                <Textarea
                  id="additional-notes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" onClick={handleBookShift}>
                Reservar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default OperatingRoomCalendar

