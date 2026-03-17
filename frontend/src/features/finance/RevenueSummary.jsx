import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import apiClient from '../../lib/apiClient'

export default function RevenueSummary() {
  const [summary, setSummary] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    try {
      const [sumRes, revRes] = await Promise.all([
        apiClient.get('/api/finance/summary/'),
        apiClient.get('/api/finance/revenue/'),
      ])
      setSummary(sumRes.data)
      setChartData(revRes.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return <div className="p-6 py-16 text-center text-sm text-gray-400">Loading…</div>
  }

  const cards = summary ? [
    { label: "Today's Invoiced",    value: summary.today?.invoiced,        color: 'text-gray-800' },
    { label: "Today's Collected",   value: summary.today?.collected,       color: 'text-green-700' },
    { label: 'Month Collected',     value: summary.this_month?.collected,  color: 'text-indigo-700' },
    { label: 'Month Expenses',      value: summary.this_month?.expenses,   color: 'text-orange-600' },
    { label: 'Month Net',           value: summary.this_month?.net,        color: summary.this_month?.net >= 0 ? 'text-green-700' : 'text-red-600' },
    { label: 'Outstanding',         value: summary.outstanding,            color: 'text-red-600' },
  ] : []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Revenue Summary</h2>
          <p className="text-sm text-gray-400 mt-0.5">Financial overview</p>
        </div>
        <button onClick={fetchData}
          className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500 leading-tight">{label}</p>
            <p className={`text-base font-bold mt-1 ${color}`}>
              ₹{parseFloat(value || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Revenue vs Expenses — Last 6 Months
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [`₹${parseFloat(value).toLocaleString()}`, name]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="invoiced"  name="Invoiced"  fill="#818cf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses"  name="Expenses"  fill="#fb923c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
