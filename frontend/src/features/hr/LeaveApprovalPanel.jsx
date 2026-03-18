import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Plus } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import { useAuth } from '../auth/useAuth'
import LeaveRequestForm from './LeaveRequestForm'

const STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const TYPE_STYLES = {
  annual:    'bg-blue-50 text-blue-700',
  sick:      'bg-purple-50 text-purple-700',
  emergency: 'bg-red-50 text-red-600',
  unpaid:    'bg-gray-100 text-gray-600',
}

export default function LeaveApprovalPanel() {
  const { isAdmin, user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [warnings, setWarnings] = useState({})
  const [myStaffId, setMyStaffId] = useState(null)

  useEffect(() => {
    if (!isAdmin && user?.id) {
      apiClient.get('/api/hr/staff/')
        .then(({ data }) => {
          const me = data.find(s => s.profile?.id === user.id)
          if (me) setMyStaffId(me.id)
        })
        .catch(() => {})
    }
  }, [user?.id, isAdmin])

  async function fetchRequests() {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const { data } = await apiClient.get(`/api/hr/leave/${params}`)
      setRequests(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [filter])

  async function handleApprove(id) {
    setActionLoading(id + '_approve')
    try {
      const { data } = await apiClient.patch(`/api/hr/leave/${id}/approve/`)
      if (data._warning) setWarnings(w => ({ ...w, [id]: data._warning }))
      fetchRequests()
    } catch {
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id) {
    const reason = prompt('Reason for rejection (optional):') ?? ''
    setActionLoading(id + '_reject')
    try {
      await apiClient.patch(`/api/hr/leave/${id}/reject/`, { reason })
      fetchRequests()
    } catch {
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Leave Requests</h2>
          <p className="text-sm text-gray-400 mt-0.5">{requests.length} requests</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRequests}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          {!isAdmin && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus size={14} /> Request Leave
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${filter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No leave requests found.</div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const staff = req.staff || {}
            const profile = staff.profile || {}
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{profile.full_name || 'Unknown'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_STYLES[req.leave_type] || 'bg-gray-100 text-gray-600'}`}>
                        {req.leave_type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[req.status]}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {req.start_date} → {req.end_date}
                      {req.total_days ? ` · ${req.total_days} day${req.total_days > 1 ? 's' : ''}` : ''}
                    </p>
                    {req.reason && <p className="text-xs text-gray-400 mt-0.5 truncate">{req.reason}</p>}
                    {warnings[req.id] && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-1">
                        ⚠ {warnings[req.id]}
                      </p>
                    )}
                  </div>

                  {isAdmin && req.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading === req.id + '_approve'}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                        <CheckCircle size={12} />
                        {actionLoading === req.id + '_approve' ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id + '_reject'}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                        <XCircle size={12} />
                        {actionLoading === req.id + '_reject' ? '…' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <LeaveRequestForm
          staffId={myStaffId}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRequests() }}
        />
      )}
    </div>
  )
}
