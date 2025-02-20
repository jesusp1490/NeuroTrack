"use client"

import { useEffect } from "react"
import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import OperatingRoomCalendar from "@/components/OperatingRoomCalendar"
import { setupRooms } from "@/scripts/setupRooms"

export default function Dashboard() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    // Setup rooms if needed
    if (user && userRole === "Cirujano") {
      setupRooms().catch(console.error)
    }
  }, [user, loading, router, userRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <p className="text-lg">
            Welcome, <span className="font-semibold">{user.email}</span>!
            {userRole && (
              <span className="ml-2 text-gray-600">({userRole.charAt(0).toUpperCase() + userRole.slice(1)})</span>
            )}
          </p>
        </div>

        {userRole === "Cirujano" && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">Operating Room Bookings</h2>
            <OperatingRoomCalendar />
          </div>
        )}

        {userRole === "Neurofisiologo" && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">Assigned Surgeries</h2>
            {/* Add component for assigned surgeries here */}
          </div>
        )}
      </main>
    </div>
  )
}

