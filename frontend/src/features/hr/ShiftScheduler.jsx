import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import apiClient from '../../lib/apiClient'

const SHIFT_COLORS = {
  regular:  'bg-blue-100 text-blue-800 border-l-2 border-blue-400',
  on_call:  'bg-purple-100 text-purple-800 border-l-2 border-purple-400',
  overtime: 'bg-orange-100 text-orange-800 border-l-2 border-orange-400',
}

function getWeekDays(ref) {
  const date = new Date(ref)
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

export default function ShiftScheduler() {
  const [weekStart, setWeekStart] = useState(new Date())
  const [staff, setStaff] = useState([])
  const [shifts, setShifts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [prefill, setPrefill] = useState({})

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const today = toDateStr(new Date())

  async function fetchShifts() {
    try {
      const week_start = toDateStr(days[0])
      const { data } = await apiClient.get(`/api/hr/shifts/?week_start=${week_start}`)
      setShifts(data)
    } catch {}
  }

  useEffect(() => {
    apiClient.get('/api/hr/staff/').then(r => setStaff(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => { fetchShifts() }, [weekStart])

  function prevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d)
  }
  function nextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d)
  }

  const shiftMap = useMemo(() => {
    const map = {}
    for (const s of shifts) {
      const key = `${s.staff_id}_${s.shift_date}`
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    return map
  }, [shifts])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Shift Scheduler</h2>
          <p className="text-sm text-gray-400 mt-0.5">Weekly view — click a cell to assign a shift</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-48 text-center">
            {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={nextWeek} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-40">Staff</th>
              {days.map(day => {
                const ds = toDateStr(day)
                const isToday = ds === today
                return (
                  <th key={ds} className={`px-2 py-3 text-center min-w-28 ${isToday ? 'bg-indigo-50' : ''}`}>
                    <p className="text-xs font-medium text-gray-500">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </p>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 truncate max-w-36">
                    {s.profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{s.designation}</p>
                </td>
                {days.map(day => {
                  const ds = toDateStr(day)
                  const key = `${s.id}_${ds}`
                  const dayShifts = shiftMap[key] || []
                  return (
                    <td key={ds}
                      onClick={() => { setPrefill({ staff_id: s.id, shift_date: ds }); setShowForm(true) }}
                      className="px-1.5 py-2 cursor-pointer hover:bg-gray-50 transition-colors align-top">
                      <div className="space-y-1 min-h-10">
                        {dayShifts.map(shift => (
                          <div key={shift.id}
                            onClick={e => e.stopPropagation()}
                            className={`text-xs px-1.5 py-1 rounded truncate ${SHIFT_COLORS[shift.shift_type] || 'bg-gray-100 text-gray-700'}`}
                            title={`${shift.start_time?.slice(0,5)}–${shift.end_time?.slice(0,5)}`}>
                            {shift.start_time?.slice(0,5)}–{shift.end_time?.slice(0,5)}
                          </div>
                        ))}
                        {dayShifts.length === 0 && (
                          <div className="flex items-center justify-center h-10 opacity-0 hover:opacity-30 transition-opacity">
                            <Plus size={12} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                  No staff found. Add staff first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddShiftModal
          staff={staff}
          prefill={prefill}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchShifts() }}
        />
      )}
    </div>
  )
}

function AddShiftModal({ staff, prefill, onClose, onSaved }) {
  const [form, setForm] = useState({
    staff_id: prefill.staff_id || '',
    shift_date: prefill.shift_date || '',
    start_time: '08:00',
    end_time: '16:00',
    shift_type: 'regular',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setWarning('')
    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/hr/shifts/', form)
      if (data._warning) setWarning(data._warning)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save shift.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Assign Shift</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Staff *</label>
            <select name="staff_id" required value={form.staff_id} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Select staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input name="shift_date" type="date" required value={form.shift_date} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time *</label>
              <input name="start_time" type="time" required value={form.start_time} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Time *</label>
              <input name="end_time" type="time" required value={form.end_time} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shift Type</label>
            <select name="shift_type" value={form.shift_type} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="regular">Regular</option>
              <option value="on_call">On Call</option>
              <option value="overtime">Overtime</option>
            </select>
          </div>
          {warning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
              ⚠ {warning}
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Assign Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
