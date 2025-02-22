"use client"

import { useEffect } from "react"
import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

// Dynamically import dashboard components
const NeurofisiologoDashboard = dynamic(() => import("@/components/NeurofisiologoDashboard"), {
  loading: () => <LoadingSpinner />,
})
const CirujanoDashboard = dynamic(() => import("@/components/CirujanoDashboard"), {
  loading: () => <LoadingSpinner />,
})
const AdministrativoDashboard = dynamic(() => import("@/components/AdministrativoDashboard"), {
  loading: () => <LoadingSpinner />,
})
const JefeDepartamentoDashboard = dynamic(() => import("@/components/JefeDepartamentoDashboard"), {
  loading: () => <LoadingSpinner />,
})

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

export default function DashboardPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user || !userRole) {
    return null
  }

  const DashboardComponent = {
    neurofisiologo: NeurofisiologoDashboard,
    cirujano: CirujanoDashboard,
    administrativo: AdministrativoDashboard,
    jefe_departamento: JefeDepartamentoDashboard,
  }[userRole]

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{DashboardComponent && <DashboardComponent />}</div>
    </div>
  )
}

