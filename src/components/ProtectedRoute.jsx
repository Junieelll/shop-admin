import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-['Poppins']">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">Authenticating...</p>
        </div>
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
