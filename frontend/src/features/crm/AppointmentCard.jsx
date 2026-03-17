import { Clock, User, Stethoscope } from 'lucide-react'

const STATUS_STYLES = {
  scheduled:  'bg-blue-100 text-blue-700 border-blue-200',
  confirmed:  'bg-green-100 text-green-700 border-green-200',
  completed:  'bg-gray-100 text-gray-600 border-gray-200',
  cancelled:  'bg-red-100 text-red-600 border-red-200',
  no_show:    'bg-yellow-100 text-yellow-700 border-yellow-200',
}
const TYPE_STYLES = {
  consultation: 'bg-indigo-50 text-indigo-600',
  follow_up:    'bg-purple-50 text-purple-600',
  procedure:    'bg-orange-50 text-orange-600',
  emergency:    'bg-red-50 text-red-600',
}

export default function AppointmentCard({ appointment, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {appointment.patient?.full_name || 'Unknown Patient'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock size={11} className="text-gray-400" />
            <p className="text-xs text-gray-500">
              {appointment.appointment_date} · {appointment.appointment_time?.slice(0, 5)}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${STATUS_STYLES[appointment.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          {appointment.status}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Stethoscope size={11} className="shrink-0" />
          Dr. {appointment.doctor?.full_name || '—'}
        </div>
        {appointment.reason && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User size={11} className="shrink-0" />
            {appointment.reason}
          </div>
        )}
      </div>

      <div className="mt-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_STYLES[appointment.type] || 'bg-gray-100 text-gray-500'}`}>
          {appointment.type?.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}
