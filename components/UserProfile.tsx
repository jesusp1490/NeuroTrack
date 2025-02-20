"use client"

import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"

type UserData = {
  name: string
  email: string
  role: "Cirujano" | "Neurofisiologo"
  createdAt: string
}

export default function UserProfile() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData)
        }
      }
    }

    fetchUserData()
  }, [user])

  if (!userData) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h2>User Profile</h2>
      <p>Name: {userData.name}</p>
      <p>Email: {userData.email}</p>
      <p>Role: {userData.role}</p>
      <p>Created At: {new Date(userData.createdAt).toLocaleString()}</p>
    </div>
  )
}

