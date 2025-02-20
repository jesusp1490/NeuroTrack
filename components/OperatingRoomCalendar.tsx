"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
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

type Room = {
  id: string
  name: string
}

type Booking = {
  id: string
  roomId: string
  date: Date
  surgeonId: string
  surgeryType: string
  estimatedDuration: number
}

const OperatingRoomCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<{ roomId: string; date: Date } | null>(null)
  const [surgeryType, setSurgeryType] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch rooms
        const roomsCollection = collection(db, "rooms")
        const roomsSnapshot = await getDocs(roomsCollection)
        const roomsList = roomsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }))
        setRooms(roomsList)

        // Fetch bookings
        const startDate = startOfWeek(currentDate)
        const endDate = addDays(startDate, 7)
        const bookingsCollection = collection(db, "bookings")
        const bookingsQuery = query(
          bookingsCollection,
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
  }, [currentDate, toast])

  const handleBookRoom = async () => {
    if (!user) {
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

    if (!surgeryType || !estimatedDuration) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos del formulario.",
        variant: "destructive",
      })
      return
    }

    try {
      await addDoc(collection(db, "bookings"), {
        roomId: selectedSlot.roomId,
        date: Timestamp.fromDate(selectedSlot.date),
        surgeonId: user.uid,
        surgeryType,
        estimatedDuration: Number.parseInt(estimatedDuration),
        createdAt: Timestamp.fromDate(new Date()),
      })

      // Refresh bookings
      const startDate = startOfWeek(currentDate)
      const endDate = addDays(startDate, 7)
      const bookingsCollection = collection(db, "bookings")
      const bookingsQuery = query(
        bookingsCollection,
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

      // Reset form
      setSelectedSlot(null)
      setSurgeryType("")
      setEstimatedDuration("")
      setIsDialogOpen(false)

      toast({
        title: "Éxito",
        description: "Quirófano reservado correctamente.",
      })
    } catch (error) {
      console.error("Error booking room:", error)
      toast({
        title: "Error",
        description: "No se pudo reservar el quirófano. Por favor, inténtelo de nuevo.",
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

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-8 w-8 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay quirófanos disponibles</h3>
        <p className="mt-1 text-sm text-gray-500">No hay quirófanos disponibles en este momento.</p>
      </div>
    )
  }

  const renderHeader = () => {
    const dateFormat = "MMMM yyyy"
    return (
      <div className="flex items-center justify-between pb-4 pt-2">
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, dateFormat, { locale: es })}</h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  const renderDays = () => {
    const dateFormat = "EEE dd/MM"
    const days = []
    const startDate = startOfWeek(currentDate)

    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i)
      days.push(
        <div key={i} className={cn("py-3 text-sm font-medium text-center border-b", isToday(day) && "bg-primary/5")}>
          {format(day, dateFormat, { locale: es })}
        </div>,
      )
    }

    return <div className="grid grid-cols-7 divide-x">{days}</div>
  }

  const renderCells = () => {
    const startDate = startOfWeek(currentDate)
    const rows = rooms.map((room) => {
      const cells = []
      let day = startDate
      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(day, i)
        const isBooked = bookings.some((booking) => booking.roomId === room.id && isSameDay(booking.date, currentDay))
        cells.push(
          <div
            key={currentDay.toString()}
            className={cn("p-2 text-center border-b border-r h-24", isToday(currentDay) && "bg-primary/5")}
          >
            {isBooked ? (
              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                Reservado
              </span>
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
                      <Input
                        id="surgeryType"
                        value={surgeryType}
                        onChange={(e) => setSurgeryType(e.target.value)}
                        className="col-span-3"
                      />
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
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleBookRoom}>
                      Confirmar Reserva
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>,
        )
        day = currentDay
      }
      return (
        <div key={room.id} className="contents">
          <div className="bg-gray-50 p-4 font-medium border-b border-r">{room.name}</div>
          {cells}
        </div>
      )
    })

    return (
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] divide-x">
        <div className="bg-gray-50 p-4 font-semibold border-b border-r">Quirófano</div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "bg-gray-50 p-4 font-semibold text-center border-b border-r",
              isToday(addDays(startDate, i)) && "bg-primary/5",
            )}
          >
            {format(addDays(startDate, i), "dd", { locale: es })}
          </div>
        ))}
        {rows}
      </div>
    )
  }

  return (
    <div className="bg-white">
      {renderHeader()}
      <div className="border rounded-lg overflow-hidden">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  )
}

export default OperatingRoomCalendar

