import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * Usage:
 *   <ProtectedRoute>                          — any authenticated user
 *   <ProtectedRoute allowedRoles={['admin']}> — admin only
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
