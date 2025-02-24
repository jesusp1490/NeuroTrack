"use client"

import type React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import AssignedSurgeries from "@/components/AssignedSurgeries"
import NeurofisiologoShiftManager from "@/components/NeurofisiologoShiftManager"
import { ErrorBoundary } from "react-error-boundary"

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h2 className="text-lg font-semibold text-red-800">Algo salió mal</h2>
      <p className="text-sm text-red-600 mt-2">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}

const NeurofisiologoDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Control - Neurofisiólogo</h1>

      <Tabs defaultValue="shifts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Gestión de Turnos
          </TabsTrigger>
          <TabsTrigger value="surgeries" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cirugías Asignadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Turnos</CardTitle>
              <CardDescription>Configure su disponibilidad y horarios de trabajo</CardDescription>
            </CardHeader>
            <CardContent>
              <NeurofisiologoShiftManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surgeries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cirugías Asignadas</CardTitle>
              <CardDescription>Lista de cirugías programadas que requieren su asistencia</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => {
                  // Reset the state of your app
                }}
              >
                <AssignedSurgeries isSurgeon={false} />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NeurofisiologoDashboard

