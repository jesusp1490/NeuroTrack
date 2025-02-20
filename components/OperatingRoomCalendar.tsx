"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns"
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Room = {
  id: string
  name: string
}

type Booking = {
  id: string
  roomId: string
  date: Date
  surgeonId: string
}

const OperatingRoomCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

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
      }
      setLoading(false)
    }

    fetchData()
  }, [currentDate])

  const handleBookRoom = async (roomId: string, date: Date) => {
    if (!user) {
      console.error("User not authenticated")
      return
    }

    try {
      await addDoc(collection(db, "bookings"), {
        roomId,
        date: Timestamp.fromDate(date),
        surgeonId: user.uid,
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
    } catch (error) {
      console.error("Error booking room:", error)
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No operating rooms</h3>
        <p className="mt-1 text-sm text-gray-500">No operating rooms are currently available.</p>
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
        <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, dateFormat)}</h2>
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
          {format(day, dateFormat)}
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
                Booked
              </span>
            ) : (
              <Button onClick={() => handleBookRoom(room.id, currentDay)} variant="outline" className="w-full">
                Book
              </Button>
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
        <div className="bg-gray-50 p-4 font-semibold border-b border-r">Room</div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "bg-gray-50 p-4 font-semibold text-center border-b border-r",
              isToday(addDays(startDate, i)) && "bg-primary/5",
            )}
          >
            {format(addDays(startDate, i), "dd")}
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

