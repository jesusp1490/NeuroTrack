import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import NeurofisiologoShiftManager from "@/components/NeurofisiologoShiftManager"
import AssignedSurgeries from "@/components/AssignedSurgeries"
import { ErrorBoundary } from "react-error-boundary"
import { useAuth } from "@/app/context/AuthContext"

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

const NeurofisiologoDashboard: React.FC = () => {
  const { user } = useAuth()
  console.log("Rendering NeurofisiologoDashboard", { userId: user?.uid })

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
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {
              // Reset the state of your app so the error doesn't happen again
            }}
          >
            <AssignedSurgeries isSurgeon={false} />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  )
}

export default NeurofisiologoDashboard

