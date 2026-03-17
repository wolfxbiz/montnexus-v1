import { useEffect, useState } from 'react'
import { Plus, RefreshCw, X } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import StaffCard from './StaffCard'

export default function StaffPage() {
  const [staff, setStaff] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)

  async function fetchStaff() {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/api/hr/staff/')
      setStaff(data)
    } catch {
      setError('Failed to load staff.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
    apiClient.get('/api/users/').then(r => setProfiles(r.data || [])).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Staff</h2>
          <p className="text-sm text-gray-400 mt-0.5">{staff.length} staff members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStaff}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Add Staff
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : staff.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No staff found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(s => (
            <StaffCard key={s.id} staff={s} onClick={() => setSelected(s)} />
          ))}
        </div>
      )}

      {showForm && (
        <AddStaffModal
          profiles={profiles}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchStaff() }}
        />
      )}

      {selected && (
        <StaffDetailModal
          staff={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchStaff() }}
        />
      )}
    </div>
  )
}

// ── Add Staff Modal ──────────────────────────────────────────
function AddStaffModal({ profiles, onClose, onSaved }) {
  const [form, setForm] = useState({
    profile_id: '', employee_id: '', designation: '',
    department: '', joining_date: '', employment_type: 'full_time',
    salary: '', annual_leave_quota: 14, sick_leave_quota: 7,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiClient.post('/api/hr/staff/', {
        ...form,
        salary: form.salary ? parseFloat(form.salary) : null,
        joining_date: form.joining_date || null,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to save.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-800">Add Staff Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Profile (User) *</label>
            <select name="profile_id" required value={form.profile_id} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Select user</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee ID</label>
              <input name="employee_id" value={form.employee_id} onChange={handleChange}
                placeholder="e.g. MNT-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
              <input name="designation" value={form.designation} onChange={handleChange}
                placeholder="e.g. Doctor"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <input name="department" value={form.department} onChange={handleChange}
                placeholder="e.g. Cardiology"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Joining Date</label>
              <input name="joining_date" type="date" value={form.joining_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
              <select name="employment_type" value={form.employment_type} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Salary</label>
              <input name="salary" type="number" value={form.salary} onChange={handleChange}
                placeholder="Monthly salary"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Annual Leave (days)</label>
              <input name="annual_leave_quota" type="number" value={form.annual_leave_quota} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sick Leave (days)</label>
              <input name="sick_leave_quota" type="number" value={form.sick_leave_quota} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Staff Detail Modal ──────────────────────────────────────
function StaffDetailModal({ staff, onClose }) {
  const profile = staff.profile || {}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Staff Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          {[
            ['Name', profile.full_name],
            ['Employee ID', staff.employee_id],
            ['Designation', staff.designation],
            ['Department', staff.department],
            ['Employment', staff.employment_type?.replace('_', ' ')],
            ['Joining Date', staff.joining_date],
            ['Annual Leave Quota', `${staff.annual_leave_quota} days`],
            ['Sick Leave Quota', `${staff.sick_leave_quota} days`],
            ['Phone', profile.phone],
          ].map(([label, value]) => value ? (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800 capitalize">{value}</span>
            </div>
          ) : null)}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
