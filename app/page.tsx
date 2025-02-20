"use client"

import { useAuth } from './context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/signin')
    }
  }, [user, router])

  return <div>Redirecting...</div>
}