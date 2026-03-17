import { useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import apiClient from '../../lib/apiClient'

export default function NotificationPanel() {
  const { profile, isAdmin } = useAuth()
  const [form, setForm] = useState({ leave_date: '', admin_phone: '' })
  const [status, setStatus] = useState('') // 'sending' | 'sent' | 'error'
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setStatus('sending')
    try {
      await apiClient.post('/api/notifications/notify/leave/', {
        staff_id: profile.id,
        leave_date: form.leave_date,
        admin_phone: form.admin_phone,
      })
      setStatus('sent')
      setForm({ leave_date: '', admin_phone: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send notification.')
      setStatus('error')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
        <p className="text-sm text-gray-400 mt-0.5">Send WhatsApp alerts to admins</p>
      </div>

      {/* Leave notification form */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Submit Leave Notice</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Date</label>
            <input
              name="leave_date"
              type="date"
              required
              value={form.leave_date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Phone <span className="text-gray-400 font-normal">(with country code, e.g. 919876543210)</span>
            </label>
            <input
              name="admin_phone"
              type="tel"
              required
              value={form.admin_phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="919876543210"
            />
          </div>

          {status === 'sent' && (
            <p className="text-sm text-green-600 font-medium">Notification sent successfully.</p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Send size={14} />
            {status === 'sending' ? 'Sending…' : 'Send WhatsApp Notification'}
          </button>
        </form>
      </div>

      {/* Info box for admins */}
      {isAdmin && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
          <p className="text-sm font-medium text-blue-800 mb-1">WhatsApp Webhook</p>
          <p className="text-xs text-blue-600">
            Incoming WhatsApp messages are handled at{' '}
            <code className="bg-blue-100 px-1 rounded">POST /api/notifications/webhook/whatsapp/</code>.
            The AI handler classifies intent and responds automatically.
          </p>
        </div>
      )}
    </div>
  )
}
