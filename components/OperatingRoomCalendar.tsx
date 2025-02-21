"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { collection, query, where, getDocs, addDoc, Timestamp, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Room {
  id: string
  name: string
  hospitalId: string
}

interface Booking {
  id: string
  roomId: string
  date: Date
  surgeonId: string
  surgeryType: string
  estimatedDuration: number
  neurophysiologistId: string
  materials?: string[]
}

interface Hospital {
  id: string
  name: string
}

interface Neurofisiologo {
  id: string
  name: string
}

interface OperatingRoomCalendarProps {
  isAdmin?: boolean
}

const OperatingRoomCalendar: React.FC<OperatingRoomCalendarProps> = ({ isAdmin = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<{ roomId: string; date: Date } | null>(null)
  const [selectedNeurofisiologos, setSelectedNeurofisiologos] = useState<string[]>([])
  const [surgeryType, setSurgeryType] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<string>("")
  const [neurofisiologos, setNeurofisiologos] = useState<Neurofisiologo[]>([])
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchBookings = useCallback(async () => {
    if (!selectedHospital) return
    const startDate = startOfWeek(currentDate)
    const endDate = addDays(startDate, 7)
    const bookingsCollection = collection(db, "bookings")
    const bookingsQuery = query(
      bookingsCollection,
      where("hospitalId", "==", selectedHospital),
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<", Timestamp.fromDate(endDate)),
    )
    const bookingsSnapshot = await getDocs(bookingsQuery)
    const bookingsList = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    })) as Booking[]
    setBookings(bookingsList)
  }, [currentDate, selectedHospital])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const hospitalsCollection = collection(db, "hospitals")
        const hospitalsSnapshot = await getDocs(hospitalsCollection)
        const hospitalsList = hospitalsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }))
        setHospitals(hospitalsList)

        if (selectedHospital) {
          const roomsCollection = collection(db, "rooms")
          const roomsQuery = query(roomsCollection, where("hospitalId", "==", selectedHospital))
          const roomsSnapshot = await getDocs(roomsQuery)
          const roomsList = roomsSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            hospitalId: doc.data().hospitalId,
          }))
          setRooms(roomsList)

          const neurofisiologosCollection = collection(db, "users")
          const neurofisiologosQuery = query(
            neurofisiologosCollection,
            where("role", "==", "neurofisiologo"),
            where("hospitalId", "==", selectedHospital),
          )
          const neurofisiologosSnapshot = await getDocs(neurofisiologosQuery)
          const neurofisiologosList = neurofisiologosSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }))
          setNeurofisiologos(neurofisiologosList)

          await fetchBookings()
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Por favor, inténtelo de nuevo más tarde.",
          variant: "destructive",
        })
      }
      setLoading(false)
    }

    fetchData()
  }, [fetchBookings, selectedHospital, toast])

  const handleBookRoom = async () => {
    if (!isAdmin && !user) {
      toast({
        title: "Error",
        description: "Debe iniciar sesión para reservar un quirófano.",
        variant: "destructive",
      })
      return
    }

    if (!selectedSlot) {
      toast({
        title: "Error",
        description: "Por favor, seleccione un horario para reservar.",
        variant: "destructive",
      })
      return
    }

    if (!surgeryType || !estimatedDuration || selectedNeurofisiologos.length === 0) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos del formulario.",
        variant: "destructive",
      })
      return
    }

    try {
      const bookingData = {
        roomId: selectedSlot.roomId,
        hospitalId: selectedHospital,
        date: Timestamp.fromDate(selectedSlot.date),
        surgeonId: user?.uid || "anonymous",
        surgeryType,
        estimatedDuration: Number(estimatedDuration),
        neurophysiologistIds: selectedNeurofisiologos,
        additionalNotes,
        createdAt: Timestamp.fromDate(new Date()),
      }

      const bookingRef = await addDoc(collection(db, "bookings"), bookingData)

      await addDoc(collection(db, "surgeries"), {
        bookingId: bookingRef.id,
        ...bookingData,
        status: "scheduled",
      })

      setSelectedSlot(null)
      setSurgeryType("")
      setEstimatedDuration("")
      setSelectedNeurofisiologos([])
      setAdditionalNotes("")
      setIsDialogOpen(false)

      toast({
        title: "Éxito",
        description: "Quirófano reservado correctamente.",
      })

      await fetchBookings()
    } catch (error) {
      console.error("Error booking room:", error)
      toast({
        title: "Error",
        description: "No se pudo reservar el quirófano. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await deleteDoc(doc(db, "bookings", bookingId))
      toast({
        title: "Éxito",
        description: "Reserva cancelada correctamente.",
      })
      await fetchBookings()
    } catch (error) {
      console.error("Error cancelling booking:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between pb-4 pt-2">
        <Select value={selectedHospital} onValueChange={setSelectedHospital}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccione un hospital" />
          </SelectTrigger>
          <SelectContent>
            {hospitals.map((hospital) => (
              <SelectItem key={hospital.id} value={hospital.id}>
                {hospital.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, "MMMM yyyy", { locale: es })}</h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedHospital && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 divide-x">
            {Array.from({ length: 7 }).map((_, i) => {
              const day = addDays(startOfWeek(currentDate), i)
              return (
                <div
                  key={i}
                  className={cn("py-3 text-sm font-medium text-center border-b", isToday(day) && "bg-primary/5")}
                >
                  {format(day, "EEE dd/MM", { locale: es })}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] divide-x">
            <div className="bg-gray-50 p-4 font-semibold border-b border-r">Quirófano</div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-gray-50 p-4 font-semibold text-center border-b border-r",
                  isToday(addDays(startOfWeek(currentDate), i)) && "bg-primary/5",
                )}
              >
                {format(addDays(startOfWeek(currentDate), i), "dd", { locale: es })}
              </div>
            ))}

            {rooms.map((room) => (
              <React.Fragment key={room.id}>
                <div className="bg-gray-50 p-4 font-medium border-b border-r">{room.name}</div>
                {Array.from({ length: 7 }).map((_, i) => {
                  const currentDay = addDays(startOfWeek(currentDate), i)
                  const booking = bookings.find(
                    (booking) => booking.roomId === room.id && isSameDay(booking.date, currentDay),
                  )
                  const isBooked = !!booking

                  return (
                    <div
                      key={i}
                      className={cn("p-2 text-center border-b border-r h-24", isToday(currentDay) && "bg-primary/5")}
                    >
                      {isBooked ? (
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            Reservado
                          </span>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleCancelBooking(booking.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => setSelectedSlot({ roomId: room.id, date: currentDay })}
                              variant="outline"
                              className="w-full"
                            >
                              Reservar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Reservar Quirófano</DialogTitle>
                              <DialogDescription>
                                Complete los detalles de la cirugía para reservar el quirófano.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="surgeryType" className="text-right">
                                  Tipo de Cirugía
                                </Label>
                                <Select value={surgeryType} onValueChange={setSurgeryType}>
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccione el tipo de cirugía" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="tipo1">Tipo 1</SelectItem>
                                    <SelectItem value="tipo2">Tipo 2</SelectItem>
                                    <SelectItem value="tipo3">Tipo 3</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="estimatedDuration" className="text-right">
                                  Duración Estimada (min)
                                </Label>
                                <Input
                                  id="estimatedDuration"
                                  type="number"
                                  value={estimatedDuration}
                                  onChange={(e) => setEstimatedDuration(e.target.value)}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="neurophysiologists" className="text-right">
                                  Neurofisiólogos
                                </Label>
                                <Select
                                  value={selectedNeurofisiologos.join(",")}
                                  onValueChange={(value) =>
                                    setSelectedNeurofisiologos(value.split(",").filter(Boolean))
                                  }
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccione neurofisiólogos" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {neurofisiologos.map((neuro) => (
                                      <SelectItem key={neuro.id} value={neuro.id}>
                                        {neuro.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="additionalNotes" className="text-right">
                                  Notas Adicionales
                                </Label>
                                <Textarea
                                  id="additionalNotes"
                                  value={additionalNotes}
                                  onChange={(e) => setAdditionalNotes(e.target.value)}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit" onClick={handleBookRoom}>
                                Confirmar Reserva
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default OperatingRoomCalendar

