import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import NeurofisiologoShiftManager from "@/components/NeurofisiologoShiftManager"
import AssignedSurgeries from "@/components/AssignedSurgeries"

const NeurofisiologoDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Turnos</CardTitle>
        </CardHeader>
        <CardContent>
          <NeurofisiologoShiftManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cirugías Asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignedSurgeries />
        </CardContent>
      </Card>
    </div>
  )
}

export default NeurofisiologoDashboard

