import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import OperatingRoomCalendar from "@/components/OperatingRoomCalendar"
import AssignedSurgeries from "@/components/AssignedSurgeries"

const CirujanoDashboard: React.FC = () => {
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
          <AssignedSurgeries isSurgeon />
        </CardContent>
      </Card>
    </div>
  )
}

export default CirujanoDashboard

