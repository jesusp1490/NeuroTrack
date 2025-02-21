import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import OperatingRoomCalendar from "@/components/OperatingRoomCalendar"
import { Button } from "@/components/ui/button"

const JefeDepartamentoDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vista General de Hospitales</CardTitle>
        </CardHeader>
        <CardContent>
          <OperatingRoomCalendar isAdmin />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button>Gestionar Neurofisiólogos</Button>
            <Button>Gestionar Cirujanos</Button>
            <Button>Gestionar Personal Administrativo</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informes y Estadísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Generar Informe</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default JefeDepartamentoDashboard

