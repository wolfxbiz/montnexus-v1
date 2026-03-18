import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BarChart2,
  Bell,
  HeartPulse,
  CalendarClock,
  UserCheck,
  CalendarRange,
  CalendarOff,
  ClipboardCheck,
  ReceiptText,
  Wallet,
  TrendingUp,
  Package,
  AlertTriangle,
  Wrench,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import navConfig from '../../config/navigation.json'
import { useAuth } from '../auth/useAuth'

const ICON_MAP = {
  LayoutDashboard,
  Users,
  FolderOpen,
  BarChart2,
  Bell,
  HeartPulse,
  CalendarClock,
  UserCheck,
  CalendarRange,
  CalendarOff,
  ClipboardCheck,
  ReceiptText,
  Wallet,
  TrendingUp,
  Package,
  AlertTriangle,
  Wrench,
}

// Group nav items by their "group" key
function groupItems(items) {
  return items.reduce((acc, item) => {
    const key = item.group || 'Main'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

function NavItem({ item, collapsed, onClick }) {
  const Icon = ICON_MAP[item.icon]
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        } ${collapsed ? 'justify-center' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          {Icon && (
            <Icon
              size={17}
              className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-700'}`}
            />
          )}
          {!collapsed && <span className="truncate">{item.label}</span>}

          {/* Tooltip when collapsed */}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {item.label}
            </div>
          )}
        </>
      )}
    </NavLink>
  )
}

function SidebarContent({ collapsed, setOpen }) {
  const { role, profile, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = navConfig[role] || []
  const grouped = groupItems(navItems)

  async function handleLogout() {
    await logout()
    navigate('/login')
    if (setOpen) setOpen(false)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-gray-100 shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        {!collapsed && (
          <span className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Mont, serif'}}>Montnexus</span>
        )}
        {collapsed && (
          <span className="text-base font-bold text-gray-900" style={{fontFamily: 'Mont, serif'}}>M</span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5 px-3">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            {/* Section label — hidden when collapsed */}
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {group}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  onClick={() => setOpen && setOpen(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile card */}
      <div className={`shrink-0 border-t border-gray-100 p-3 space-y-1`}>
        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-indigo-700 text-xs font-semibold">{initials}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize truncate">{profile?.role}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <SidebarContent collapsed={collapsed} />

      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-base font-bold text-gray-900" style={{fontFamily: 'Mont, serif'}}>Montnexus</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-white h-full shadow-2xl z-50 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <X size={16} />
            </button>
            <SidebarContent collapsed={false} setOpen={setMobileOpen} />
          </aside>
        </div>
      )}
    </>
  )
}
