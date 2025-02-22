"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import OperatingRoomCalendar from "@/components/OperatingRoomCalendar"
import AssignedSurgeries from "@/components/AssignedSurgeries"
// Add console.log for debugging
import { useEffect } from "react"

const CirujanoDashboard: React.FC = () => {
  useEffect(() => {
    console.log("CirujanoDashboard rendered")
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reserva de Quirófano</CardTitle>
        </CardHeader>
        <CardContent>
          <OperatingRoomCalendar />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis Cirugías Programadas</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignedSurgeries isSurgeon={true} />
        </CardContent>
      </Card>
    </div>
  )
}

export default CirujanoDashboard

