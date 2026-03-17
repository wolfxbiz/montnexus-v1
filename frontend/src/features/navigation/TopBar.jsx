import { Bell } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

export default function TopBar({ title }) {
  const { profile, role } = useAuth()

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-100">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-gray-600">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm text-gray-600 hidden sm:block">
            {profile?.full_name || 'User'}
          </span>
          {role && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
              {role}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
