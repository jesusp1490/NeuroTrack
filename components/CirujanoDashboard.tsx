"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WeekCalendar } from "@/components/WeekCalendar"
import AssignedSurgeries from "@/components/AssignedSurgeries"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, ClipboardList } from "lucide-react"

const CirujanoDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Control - Cirujano</h1>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Programar Cirugía
          </TabsTrigger>
          <TabsTrigger value="surgeries" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Cirugías Programadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Reserva de Quirófano</CardTitle>
              <CardDescription>
                Seleccione una fecha y horario disponible para programar una nueva cirugía
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[800px] border rounded-md">
                <WeekCalendar />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surgeries">
          <Card>
            <CardHeader>
              <CardTitle>Mis Cirugías Programadas</CardTitle>
              <CardDescription>Lista de todas sus cirugías programadas y pendientes</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignedSurgeries isSurgeon={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CirujanoDashboard

