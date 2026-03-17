import { useEffect, useState } from 'react'
import { UserPlus, RefreshCw } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import UserTable from './UserTable'
import InviteUserModal from './InviteUserModal'

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/api/users/')
      setUsers(data)
    } catch (err) {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} total users</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <UserPlus size={14} />
            Invite User
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading users…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : (
        <UserTable users={users} />
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onInvited={fetchUsers}
        />
      )}
    </div>
  )
}
