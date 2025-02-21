"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/app/context/AuthContext"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"

type ShiftType = "morning" | "afternoon"

interface Shift {
  id: string
  neurophysiologistId: string
  hospitalId: string
  date: Timestamp
  type: ShiftType
  createdAt: Timestamp
  booked: boolean
}

interface Hospital {
  id: string
  name: string
}

const NeurofisiologoShiftManager: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [shiftType, setShiftType] = useState<ShiftType | "">("")
  const [selectedHospital, setSelectedHospital] = useState<string>("")
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [existingShifts, setExistingShifts] = useState<Shift[]>([])

  useEffect(() => {
    if (user) {
      fetchHospitals()
      fetchExistingShifts()
    }
  }, [user])

  const fetchHospitals = async () => {
    const hospitalsRef = collection(db, "hospitals")
    const snapshot = await getDocs(hospitalsRef)
    const hospitalsList = snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
    setHospitals(hospitalsList)
  }

  const fetchExistingShifts = async () => {
    if (!user) return
    const shiftsRef = collection(db, "shifts")
    const q = query(shiftsRef, where("neurophysiologistId", "==", user.uid))
    const querySnapshot = await getDocs(q)
    const shifts = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Shift[]
    setExistingShifts(shifts)
  }

  const handleSetShift = async () => {
    if (!user || !selectedDate || !shiftType || !selectedHospital) {
      toast({
        title: "Error",
        description: "Por favor, seleccione una fecha, un tipo de turno y un hospital.",
        variant: "destructive",
      })
      return
    }

    try {
      await addDoc(collection(db, "shifts"), {
        neurophysiologistId: user.uid,
        hospitalId: selectedHospital,
        date: Timestamp.fromDate(selectedDate),
        type: shiftType,
        createdAt: Timestamp.fromDate(new Date()),
        booked: false,
      })

      toast({
        title: "Éxito",
        description: "Turno establecido correctamente.",
      })

      await fetchExistingShifts()
      setShiftType("")
      setSelectedHospital("")
    } catch (error) {
      console.error("Error setting shift:", error)
      toast({
        title: "Error",
        description: "No se pudo establecer el turno. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
      <Select value={shiftType} onValueChange={(value: ShiftType) => setShiftType(value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccione el tipo de turno" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="morning">Mañana</SelectItem>
          <SelectItem value="afternoon">Tarde</SelectItem>
        </SelectContent>
      </Select>
      <Select value={selectedHospital} onValueChange={(value: string) => setSelectedHospital(value)}>
        <SelectTrigger className="w-full">
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
      <Button onClick={handleSetShift}>Establecer Turno</Button>
      <div>
        <h3 className="text-lg font-semibold mb-2">Turnos Establecidos</h3>
        <ul className="space-y-2">
          {existingShifts.map((shift) => (
            <li key={shift.id} className="p-2 bg-secondary rounded-md text-sm">
              {shift.date.toDate().toLocaleDateString()} - {shift.type === "morning" ? "Mañana" : "Tarde"} -
              {hospitals.find((h) => h.id === shift.hospitalId)?.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default NeurofisiologoShiftManager

