import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-gray-500">{formatDate(label)}</p>
      <p className="font-semibold text-gray-800">{payload[0].value} actions</p>
    </div>
  )
}

export default function ActivityChart({ data }) {
  const chartData = (data || []).map(d => ({ ...d, label: d.date }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity — Last 30 Days</h3>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No activity data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="actions"
              stroke="#111827"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#111827' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
