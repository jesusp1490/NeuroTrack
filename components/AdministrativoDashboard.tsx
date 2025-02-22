import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import OperatingRoomCalendar from "@/components/OperatingRoomCalendar"
import { Button } from "@/components/ui/button"

const AdministrativoDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <OperatingRoomCalendar isAdmin />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informes de Cirugías</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Generar Informe PDF</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdministrativoDashboard

