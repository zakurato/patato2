import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, authReady } = useAuth()

  if (!authReady) {
    return <p style={{ padding: '2rem' }}>Cargando...</p>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
