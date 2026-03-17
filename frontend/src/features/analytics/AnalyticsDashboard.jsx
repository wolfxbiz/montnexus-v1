import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, ClipboardList, ReceiptText, AlertTriangle } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import SummaryCards from './charts/SummaryCards'
import ActivityChart from './charts/ActivityChart'

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null)
  const [activity, setActivity] = useState([])
  const [erp, setErp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError('')
      const today = new Date().toISOString().split('T')[0]
      try {
        const [summaryRes, activityRes, apptRes, leaveRes, financeRes, stockRes] = await Promise.all([
          apiClient.get('/api/analytics/summary/'),
          apiClient.get('/api/analytics/activity/'),
          apiClient.get(`/api/crm/appointments/?date_from=${today}&date_to=${today}`),
          apiClient.get('/api/hr/leave/?status=pending'),
          apiClient.get('/api/finance/summary/'),
          apiClient.get('/api/inventory/alerts/'),
        ])
        setSummary(summaryRes.data)
        setActivity(activityRes.data)
        setErp({
          todayAppts: apptRes.data?.length ?? 0,
          pendingLeave: leaveRes.data?.length ?? 0,
          outstandingInvoices: financeRes.data?.outstanding ?? 0,
          lowStockItems: Array.isArray(stockRes.data) ? stockRes.data.length : 0,
        })
      } catch {
        setError('Failed to load analytics.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading analytics…</div>
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
        <p className="text-sm text-gray-400 mt-0.5">System-wide overview</p>
      </div>

      {/* ERP quick-stat widgets */}
      {erp && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ErpWidget
            icon={<CalendarClock size={18} className="text-indigo-600" />}
            bg="bg-indigo-50"
            label="Today's Appointments"
            value={erp.todayAppts}
            onClick={() => navigate('/crm/appointments')}
          />
          <ErpWidget
            icon={<ClipboardList size={18} className="text-amber-600" />}
            bg="bg-amber-50"
            label="Pending Leave Requests"
            value={erp.pendingLeave}
            onClick={() => navigate('/hr/leave')}
          />
          <ErpWidget
            icon={<ReceiptText size={18} className="text-rose-600" />}
            bg="bg-rose-50"
            label="Outstanding Invoices"
            value={`₹${Number(erp.outstandingInvoices).toLocaleString()}`}
            onClick={() => navigate('/finance/billing')}
          />
          <ErpWidget
            icon={<AlertTriangle size={18} className="text-orange-600" />}
            bg="bg-orange-50"
            label="Low Stock Items"
            value={erp.lowStockItems}
            onClick={() => navigate('/inventory/alerts')}
          />
        </div>
      )}

      <SummaryCards data={summary} />
      <ActivityChart data={activity} />
    </div>
  )
}

function ErpWidget({ icon, bg, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:shadow-sm transition-shadow space-y-3 w-full"
    >
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </button>
  )
}
