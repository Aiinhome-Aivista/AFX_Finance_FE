import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Loading } from './States'

export default function ProtectedRoute({ children, allowedRoles, redirectTo }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Loading label="Checking your session…" className="min-h-screen" />
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  const role = user?.role || 'data_architect'
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo || (role === 'data_analyst' ? '/finance' : '/apps')} replace />
  }
  return children
}
