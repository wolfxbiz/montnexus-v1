import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import apiClient from '../../lib/apiClient'

const STATUS_STYLES = {
  present:  'bg-green-100 text-green-700',
  absent:   'bg-red-100 text-red-600',
  late:     'bg-yellow-100 text-yellow-700',
  on_leave: 'bg-blue-100 text-blue-700',
  holiday:  'bg-purple-100 text-purple-700',
}

function getMonthStr(date) {
  return date.toISOString().slice(0, 7)
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export default function AttendancePage() {
  const [staff, setStaff] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [month, setMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [markForm, setMarkForm] = useState(null)

  useEffect(() => {
    apiClient.get('/api/hr/staff/').then(r => {
      const s = r.data || []
      setStaff(s)
      if (s.length > 0) setSelectedStaff(s[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedStaff) return
    setLoading(true)
    apiClient.get(`/api/hr/attendance/?staff_id=${selectedStaff.id}&month=${getMonthStr(month)}`)
      .then(r => setAttendance(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedStaff, month])

  function prevMonth() {
    const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d)
  }
  function nextMonth() {
    const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d)
  }

  const attendanceMap = {}
  for (const a of attendance) {
    attendanceMap[a.date] = a
  }

  const year = month.getFullYear()
  const monthIdx = month.getMonth()
  const totalDays = getDaysInMonth(year, monthIdx)
  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(year, monthIdx, i + 1)
    return d.toISOString().split('T')[0]
  })

  async function handleMark(dateStr, currentStatus) {
    const newStatus = prompt(
      `Mark attendance for ${dateStr}\nOptions: present, absent, late, on_leave, holiday`,
      currentStatus || 'present'
    )
    if (!newStatus) return
    try {
      await apiClient.post('/api/hr/attendance/', {
        staff_id: selectedStaff.id,
        date: dateStr,
        status: newStatus,
      })
      // Refresh
      const { data } = await apiClient.get(
        `/api/hr/attendance/?staff_id=${selectedStaff.id}&month=${getMonthStr(month)}`
      )
      setAttendance(data)
    } catch {}
  }

  const summary = days.reduce((acc, d) => {
    const rec = attendanceMap[d]
    if (rec) acc[rec.status] = (acc[rec.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Attendance</h2>
          <p className="text-sm text-gray-400 mt-0.5">Monthly attendance tracker</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-32 text-center">
            {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Staff selector */}
      <div className="flex gap-2 flex-wrap">
        {staff.map(s => (
          <button key={s.id} onClick={() => setSelectedStaff(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedStaff?.id === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.profile?.full_name}
          </button>
        ))}
      </div>

      {/* Summary */}
      {Object.keys(summary).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(summary).map(([st, count]) => (
            <div key={st} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${STATUS_STYLES[st] || 'bg-gray-100 text-gray-600'}`}>
              {st.replace('_', ' ')}: {count}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-gray-50 border-b border-gray-100">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: (new Date(year, monthIdx, 1).getDay() || 7) - 1 }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-16 border-b border-r border-gray-50" />
            ))}
            {days.map(dateStr => {
              const rec = attendanceMap[dateStr]
              const day = parseInt(dateStr.split('-')[2])
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              return (
                <div key={dateStr}
                  onClick={() => selectedStaff && handleMark(dateStr, rec?.status)}
                  className="min-h-16 border-b border-r border-gray-50 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-600'}`}>{day}</p>
                  {rec && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize block text-center truncate ${STATUS_STYLES[rec.status] || 'bg-gray-100 text-gray-600'}`}>
                      {rec.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">Click any date to mark or update attendance</p>
    </div>
  )
}
