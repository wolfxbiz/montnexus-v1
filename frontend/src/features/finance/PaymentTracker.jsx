import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import apiClient from '../../lib/apiClient'

export default function PaymentTracker({ invoice, payments, onSaved }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount_paid: '', payment_method: 'cash', reference_number: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)
  const totalDue = parseFloat(invoice.total_amount || 0) - totalPaid

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiClient.post('/api/finance/payments/', {
        invoice_id: invoice.id,
        ...form,
        amount_paid: parseFloat(form.amount_paid),
      })
      setShowForm(false)
      setForm({ amount_paid: '', payment_method: 'cash', reference_number: '', notes: '' })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Invoice Total', value: invoice.total_amount, color: 'text-gray-800' },
          { label: 'Total Paid', value: totalPaid, color: 'text-green-700' },
          { label: 'Balance Due', value: Math.max(0, totalDue), color: totalDue > 0 ? 'text-red-600' : 'text-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-lg font-bold ${color}`}>₹{parseFloat(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment History</p>
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">₹{parseFloat(p.amount_paid).toLocaleString()}</p>
                <p className="text-xs text-gray-400">{p.payment_date?.slice(0, 10)} · {p.payment_method || '—'}</p>
                {p.reference_number && <p className="text-xs text-gray-400">Ref: {p.reference_number}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record payment */}
      {totalDue > 0 && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
          <Plus size={14} /> Record Payment
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-600">Record Payment</p>
            <button type="button" onClick={() => setShowForm(false)}><X size={14} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input required type="number" step="0.01" value={form.amount_paid}
                onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
                placeholder={`Max ₹${totalDue.toFixed(2)}`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
              <select value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {['cash', 'card', 'upi', 'insurance', 'other'].map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <input value={form.reference_number}
            onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
            placeholder="Reference number (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving…' : 'Record Payment'}
          </button>
        </form>
      )}
    </div>
  )
}
