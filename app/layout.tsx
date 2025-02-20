import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { AuthContextProvider } from "./context/AuthContext"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "NeuroTrack",
  description: "Sistema de Programación de Quirófanos",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthContextProvider>
          {children}
          <Toaster />
        </AuthContextProvider>
      </body>
    </html>
  )
}

