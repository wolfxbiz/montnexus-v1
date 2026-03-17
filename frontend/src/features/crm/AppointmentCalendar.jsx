import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_BG = {
  scheduled: 'bg-blue-100 text-blue-800 border-l-2 border-blue-400',
  confirmed:  'bg-green-100 text-green-800 border-l-2 border-green-500',
  completed:  'bg-gray-100 text-gray-600 border-l-2 border-gray-400',
  cancelled:  'bg-red-50 text-red-600 border-l-2 border-red-400 line-through opacity-60',
  no_show:    'bg-yellow-100 text-yellow-800 border-l-2 border-yellow-400',
}

function getWeekDays(referenceDate) {
  const date = new Date(referenceDate)
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

export default function AppointmentCalendar({ appointments, weekStart, onWeekChange, onSlotClick }) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart])

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    onWeekChange(d)
  }
  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    onWeekChange(d)
  }

  const byDate = useMemo(() => {
    const map = {}
    for (const appt of appointments) {
      if (!map[appt.appointment_date]) map[appt.appointment_date] = []
      map[appt.appointment_date].push(appt)
    }
    return map
  }, [appointments])

  const today = toDateStr(new Date())

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-gray-700">
          {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
          {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 divide-x divide-gray-50">
        {days.map(day => {
          const dateStr = toDateStr(day)
          const isToday = dateStr === today
          const dayAppts = (byDate[dateStr] || []).sort((a, b) =>
            a.appointment_time?.localeCompare(b.appointment_time)
          )

          return (
            <div key={dateStr} className="min-h-48">
              {/* Day label */}
              <div className={`px-2 py-2 text-center border-b border-gray-50 ${isToday ? 'bg-indigo-600' : 'bg-gray-50'}`}>
                <p className={`text-xs font-medium ${isToday ? 'text-white' : 'text-gray-500'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-gray-700'}`}>
                  {day.getDate()}
                </p>
              </div>

              {/* Appointments */}
              <div
                className="p-1.5 space-y-1 min-h-36 cursor-pointer"
                onClick={() => onSlotClick && onSlotClick(dateStr)}
              >
                {dayAppts.map(appt => (
                  <div
                    key={appt.id}
                    onClick={e => { e.stopPropagation(); onSlotClick && onSlotClick(dateStr, appt) }}
                    className={`text-xs px-1.5 py-1 rounded cursor-pointer truncate ${STATUS_BG[appt.status] || 'bg-gray-100 text-gray-700'}`}
                    title={`${appt.appointment_time?.slice(0, 5)} · ${appt.patient?.full_name}`}
                  >
                    <span className="font-medium">{appt.appointment_time?.slice(0, 5)}</span>
                    {' '}{appt.patient?.full_name}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
