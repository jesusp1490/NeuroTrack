"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"

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
    return <div>Loading calendar...</div>
  }

  if (rooms.length === 0) {
    return <div>No operating rooms available.</div>
  }

  const renderHeader = () => {
    const dateFormat = "MMMM yyyy"
    return (
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setCurrentDate(addDays(currentDate, -7))}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Previous Week
        </button>
        <span className="text-xl font-semibold">{format(currentDate, dateFormat)}</span>
        <button
          onClick={() => setCurrentDate(addDays(currentDate, 7))}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Next Week
        </button>
      </div>
    )
  }

  const renderDays = () => {
    const dateFormat = "EEE dd/MM"
    const days = []
    const startDate = startOfWeek(currentDate)

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-semibold p-2 bg-gray-50 border-b">
          {format(addDays(startDate, i), dateFormat)}
        </div>,
      )
    }

    return <div className="grid grid-cols-7 gap-px mb-px">{days}</div>
  }

  const renderCells = () => {
    const startDate = startOfWeek(currentDate)
    const endDate = addDays(startDate, 7)
    const rows = rooms.map((room) => {
      const cells = []
      let day = startDate
      while (day < endDate) {
        const isBooked = bookings.some((booking) => booking.roomId === room.id && isSameDay(booking.date, day))
        cells.push(
          <div key={day.toString()} className="border p-4 text-center">
            {isBooked ? (
              <span className="inline-block px-2 py-1 text-red-700 bg-red-100 rounded-full text-sm">Booked</span>
            ) : (
              <button
                onClick={() => handleBookRoom(room.id, day)}
                className="inline-block px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
              >
                Book
              </button>
            )}
          </div>,
        )
        day = addDays(day, 1)
      }
      return (
        <div key={room.id} className="contents">
          <div className="bg-gray-50 p-4 font-medium border-r">{room.name}</div>
          {cells}
        </div>
      )
    })

    return (
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-px bg-gray-200">
        <div className="bg-gray-50 p-4 font-semibold border-r">Room</div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-gray-50 p-4 font-semibold text-center">
            {format(addDays(startDate, i), "dd")}
          </div>
        ))}
        {rows}
      </div>
    )
  }

  return (
    <div className="w-full">
      {renderHeader()}
      <div className="bg-white border rounded-lg overflow-hidden">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  )
}

export default OperatingRoomCalendar

