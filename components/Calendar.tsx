"use client"

import { useState } from "react"
import { format, startOfWeek, addDays, addWeeks, isSameDay } from "date-fns"

type Shift = {
  id: string
  date: Date
  type: "morning" | "afternoon"
  neurophysiologistId: string
  booked: boolean
}

type CalendarProps = {
  shifts: Shift[]
  onShiftSelect: (shift: Shift) => void
  userRole: "surgeon" | "neurophysiologist"
}

export default function Calendar({ shifts, onShiftSelect, userRole }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const renderHeader = () => {
    const dateFormat = "MMMM yyyy"
    return (
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentDate(addWeeks(currentDate, -1))}>&lt;</button>
        <span className="text-lg font-bold">{format(currentDate, dateFormat)}</span>
        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>&gt;</button>
      </div>
    )
  }

  const renderDays = () => {
    const dateFormat = "EEE"
    const days = []
    const startDate = startOfWeek(currentDate)

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-semibold">
          {format(addDays(startDate, i), dateFormat)}
        </div>,
      )
    }

    return <div className="grid grid-cols-7 gap-2 mb-2">{days}</div>
  }

  const renderCells = () => {
    const startDate = startOfWeek(currentDate)
    const endDate = addDays(startDate, 7)
    const dateFormat = "d"
    const rows = []

    let days = []
    let day = startDate
    let formattedDate = ""

    while (day < endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat)
        const dayShifts = shifts.filter((shift) => isSameDay(shift.date, day))
        days.push(
          <div key={day.toString()} className="border p-2">
            <div className="text-right">{formattedDate}</div>
            {dayShifts.map((shift) => (
              <button
                key={shift.id}
                onClick={() => onShiftSelect(shift)}
                className={`w-full text-left p-1 mt-1 text-sm ${
                  shift.booked ? "bg-red-200" : "bg-green-200"
                } ${userRole === "surgeon" && shift.booked ? "cursor-not-allowed" : "cursor-pointer"}`}
                disabled={userRole === "surgeon" && shift.booked}
              >
                {shift.type === "morning" ? "AM" : "PM"}
              </button>
            ))}
          </div>,
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-2">
          {days}
        </div>,
      )
      days = []
    }
    return <div className="mt-2">{rows}</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  )
}

