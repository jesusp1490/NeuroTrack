"use client"

import { useEffect } from "react"
import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import OperatingRoomCalendar from "@/components/OperatingRoomCalendar"
import { CalendarDays, LogOut, Menu, Settings, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"

export default function Dashboard() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button className="lg:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700">
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="ml-4 lg:ml-0">
              <h1 className="text-2xl font-semibold text-gray-900">NeuroTrack</h1>
            </div>
          </div>
          <div className="flex items-center gap-x-8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <span>Calendar</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Welcome card */}
          <div className="mb-6 overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Welcome back!</h3>
                  <div className="mt-1 flex items-center">
                    <p className="text-sm text-gray-500">Signed in as {user.email}</p>
                    <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {userRole === "cirujano" && (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-6">
                <h2 className="text-base font-semibold leading-7 text-gray-900">Operating Room Bookings</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">Select a time slot to book an operating room.</p>
                <div className="mt-6">
                  <OperatingRoomCalendar />
                </div>
              </div>
            </div>
          )}

          {userRole === "neurofisiologo" && (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-6">
                <h2 className="text-base font-semibold leading-7 text-gray-900">Assigned Surgeries</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">View and manage your assigned surgeries.</p>
                {/* Add AssignedSurgeries component here */}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

