import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { AuthContextProvider } from "./context/AuthContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "NeuroTrack",
  description: "A web-based scheduling tool for operating room reservations",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthContextProvider>{children}</AuthContextProvider>
      </body>
    </html>
  )
}

