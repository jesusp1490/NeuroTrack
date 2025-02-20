import { useEffect } from 'react'
import { onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'

export default function NotificationHandler() {
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload)
      // You can customize how to display the notification here
      // For example, you could use a toast notification library
      alert(payload.notification?.title + ': ' + payload.notification?.body)
    })

    return () => unsubscribe()
  }, [])

  return null
}