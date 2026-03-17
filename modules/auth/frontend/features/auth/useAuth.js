import { useAuthContext } from '../../context/AuthContext'

/**
 * Convenience hook — consumes AuthContext.
 * Returns: { user, profile, role, isAdmin, loading, login, loginWithMagicLink, logout }
 */
export function useAuth() {
  return useAuthContext()
}
