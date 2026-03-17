import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, FolderOpen, BarChart2, Bell, ArrowRight, FileText } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import { useAuth } from '../auth/useAuth'

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon size={15} className="text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <ArrowRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
    </Link>
  )
}

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth()
  const [summary, setSummary] = useState(null)
  const [recentDocs, setRecentDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [docsRes, summaryRes] = await Promise.allSettled([
          apiClient.get('/api/storage/files/'),
          isAdmin ? apiClient.get('/api/analytics/summary/') : Promise.resolve(null),
        ])

        if (docsRes.status === 'fulfilled') {
          const sorted = [...docsRes.value.data].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )
          setRecentDocs(sorted.slice(0, 5))
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          setSummary(summaryRes.value.data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isAdmin])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-7">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{profile?.role} · {profile?.department || 'Montnexus'}</p>
      </div>

      {/* Admin summary cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"        value={loading ? '…' : summary?.total_users}     icon={Users}      color="text-blue-500"   bg="bg-blue-50" />
          <StatCard label="Active Staff"       value={loading ? '…' : summary?.active_staff}    icon={Users}      color="text-green-500"  bg="bg-green-50" />
          <StatCard label="Documents"          value={loading ? '…' : summary?.total_documents} icon={FolderOpen} color="text-yellow-500" bg="bg-yellow-50" />
          <StatCard label="Actions This Week"  value={loading ? '…' : summary?.weekly_actions}  icon={BarChart2}  color="text-purple-500" bg="bg-purple-50" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent documents */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Recent Documents</h3>
            <Link to="/docs" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <p className="text-xs text-gray-400 py-4 text-center">Loading…</p>
          ) : recentDocs.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentDocs.map(doc => (
                <li key={doc.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FileText size={13} className="text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">{doc.file_name}</p>
                    <p className="text-xs text-gray-400">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
          <QuickLink to="/docs"          icon={FolderOpen} label="Document Vault"   description="Upload and manage files" />
          <QuickLink to="/notifications" icon={Bell}       label="Notifications"    description="Send leave alerts via WhatsApp" />
          {isAdmin && (
            <>
              <QuickLink to="/users"     icon={Users}      label="User Management"  description="Invite and manage team members" />
              <QuickLink to="/analytics" icon={BarChart2}  label="Analytics"        description="View activity and usage stats" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
