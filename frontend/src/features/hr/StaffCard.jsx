import { Briefcase, Phone, Building2 } from 'lucide-react'

const EMP_TYPE = {
  full_time: 'bg-green-100 text-green-700',
  part_time: 'bg-blue-100 text-blue-700',
  contract:  'bg-orange-100 text-orange-700',
}

export default function StaffCard({ staff, onClick }) {
  const profile = staff.profile || {}
  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-indigo-700 text-sm font-semibold">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{profile.full_name}</p>
          <p className="text-xs text-gray-500 truncate">{staff.designation || '—'}</p>
        </div>
        {staff.employment_type && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${EMP_TYPE[staff.employment_type] || 'bg-gray-100 text-gray-600'}`}>
            {staff.employment_type.replace('_', ' ')}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {staff.department && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Building2 size={11} className="shrink-0" />
            {staff.department}
          </div>
        )}
        {profile.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone size={11} className="shrink-0" />
            {profile.phone}
          </div>
        )}
        {staff.employee_id && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Briefcase size={11} className="shrink-0" />
            {staff.employee_id}
          </div>
        )}
      </div>
    </div>
  )
}
