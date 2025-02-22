import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to NeuroTrack
        </h1>
        <div className="space-x-4">
          <Link href="/signup" className="text-blue-500 hover:underline">
            Sign Up
          </Link>
          <Link href="/login" className="text-blue-500 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  )
}