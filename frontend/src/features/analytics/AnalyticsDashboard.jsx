import { useEffect, useState } from 'react'
import apiClient from '../../lib/apiClient'
import SummaryCards from './charts/SummaryCards'
import ActivityChart from './charts/ActivityChart'

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError('')
      try {
        const [summaryRes, activityRes] = await Promise.all([
          apiClient.get('/api/analytics/summary/'),
          apiClient.get('/api/analytics/activity/'),
        ])
        setSummary(summaryRes.data)
        setActivity(activityRes.data)
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
      <SummaryCards data={summary} />
      <ActivityChart data={activity} />
    </div>
  )
}
