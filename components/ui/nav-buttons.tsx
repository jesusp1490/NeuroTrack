"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, LogOut } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export function NavButtons() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="flex justify-between items-center mb-4">
      <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Volver">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </div>
  )
}

