"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { getToken } from "firebase/messaging"
import { auth, db, messaging } from "@/lib/firebase"

type AuthContextType = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user)
      setLoading(false)

      if (user) {
        try {
          const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" })
          await setDoc(doc(db, "users", user.uid), { fcmToken: token }, { merge: true })
        } catch (error) {
          console.error("Error getting FCM token:", error)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

