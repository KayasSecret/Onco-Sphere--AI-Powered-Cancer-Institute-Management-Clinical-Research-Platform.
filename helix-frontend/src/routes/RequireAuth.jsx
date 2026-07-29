import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUserRole } from '../redux/slices/authSlice'

/**
 * <RequireAuth roles={['SUPER_ADMIN', 'ADMIN']}>
 *
 * Wraps protected routes. Redirects to /login if not authenticated,
 * or to /unauthorized if authenticated but wrong role.
 *
 * Role enforcement here is UI-layer only — every backend route also
 * enforces roles server-side via require_roles() dependency.
 *
 * Props:
 * - roles: string[] — allowed roles. Pass [] to allow any authenticated user.
 * - children: React node
 */
export default function RequireAuth({ roles = [], children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const userRole = useSelector(selectUserRole)
  const location = useLocation()

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
