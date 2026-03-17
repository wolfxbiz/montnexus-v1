import { Users, UserCheck, FolderOpen, Activity } from 'lucide-react'

const CARDS = [
  { key: 'total_users',     label: 'Total Users',         icon: Users,      color: 'text-blue-500',   bg: 'bg-blue-50' },
  { key: 'active_staff',    label: 'Active Staff',        icon: UserCheck,  color: 'text-green-500',  bg: 'bg-green-50' },
  { key: 'total_documents', label: 'Documents Uploaded',  icon: FolderOpen, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { key: 'weekly_actions',  label: 'Actions This Week',   icon: Activity,   color: 'text-purple-500', bg: 'bg-purple-50' },
]

export default function SummaryCards({ data }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
            <Icon size={18} className={color} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{data?.[key] ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
