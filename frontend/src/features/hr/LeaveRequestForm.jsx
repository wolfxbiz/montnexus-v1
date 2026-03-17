import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import apiClient from '../../lib/apiClient'

export default function LeaveRequestForm({ staffId, onClose, onSaved }) {
  const [form, setForm] = useState({
    staff_id: staffId || '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  })
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (staffId) {
      apiClient.get(`/api/hr/leave-balance/${staffId}/`)
        .then(r => setBalance(r.data))
        .catch(() => {})
    }
  }, [staffId])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const requestedDays = (() => {
    if (!form.start_date || !form.end_date) return 0
    const diff = (new Date(form.end_date) - new Date(form.start_date)) / 86400000
    return diff < 0 ? 0 : diff + 1
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiClient.post('/api/hr/leave/', form)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to submit.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Request Leave</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {balance && (
          <div className="px-6 pt-4 grid grid-cols-2 gap-2">
            {['annual', 'sick'].map(type => (
              <div key={type} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-gray-500 capitalize">{type} leave</p>
                <p className="text-lg font-bold text-gray-800">{balance[type]?.remaining ?? '—'}</p>
                <p className="text-xs text-gray-400">days remaining</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Leave Type *</label>
            <select name="leave_type" required value={form.leave_type} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="emergency">Emergency</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input name="start_date" type="date" required value={form.start_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
              <input name="end_date" type="date" required value={form.end_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          {requestedDays > 0 && (
            <p className="text-xs text-indigo-600 font-medium">{requestedDays} day{requestedDays > 1 ? 's' : ''} requested</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <textarea name="reason" value={form.reason} onChange={handleChange} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="Brief reason for leave…" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
