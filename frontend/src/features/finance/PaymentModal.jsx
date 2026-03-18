import { useState } from 'react'
import { X, CreditCard, Banknote, CheckCircle } from 'lucide-react'
import apiClient from '../../lib/apiClient'

const OFFLINE_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

export default function PaymentModal({ invoice, onClose, onPaid }) {
  const [tab, setTab] = useState('online')  // 'online' | 'offline'
  const [offline, setOffline] = useState({
    amount_paid: invoice.total_due ?? invoice.total_amount ?? '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // ── Online payment via Razorpay ──────────────────────────────
  async function handleOnlinePay() {
    setError('')
    setLoading(true)
    try {
      const { data } = await apiClient.post(`/api/finance/invoices/${invoice.id}/create-order/`)

      const options = {
        key: data.key_id,
        amount: data.amount_paise,
        currency: data.currency,
        name: 'Montnexus',
        description: `Invoice ${data.invoice_number}`,
        order_id: data.order_id,
        prefill: {
          name: data.patient_name,
          contact: data.patient_phone,
        },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          try {
            await apiClient.post('/api/finance/payments/verify/', {
              invoice_id: invoice.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setSuccess(true)
            setTimeout(() => { onPaid(); onClose() }, 1500)
          } catch {
            setError('Payment verification failed. Contact support.')
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(`Payment failed: ${resp.error.description}`)
        setLoading(false)
      })
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not initiate payment.')
      setLoading(false)
    }
  }

  // ── Offline payment ──────────────────────────────────────────
  async function handleOfflinePay(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiClient.post(`/api/finance/invoices/${invoice.id}/record-offline/`, offline)
      setSuccess(true)
      setTimeout(() => { onPaid(); onClose() }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment.')
    } finally {
      setLoading(false)
    }
  }

  const outstanding = invoice.total_due ?? invoice.total_amount ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Record Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.invoice_number} · Outstanding: ₹{parseFloat(outstanding).toLocaleString('en-IN')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle size={48} className="text-green-500" />
            <p className="text-base font-semibold text-gray-800">Payment Recorded</p>
            <p className="text-sm text-gray-400">Invoice status updated.</p>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex gap-1 px-6 pt-5">
              <button
                onClick={() => setTab('online')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${tab === 'online' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <CreditCard size={14} /> Pay Online
              </button>
              <button
                onClick={() => setTab('offline')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${tab === 'offline' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Banknote size={14} /> Record Offline
              </button>
            </div>

            <div className="px-6 pb-6 pt-4">
              {/* Online tab */}
              {tab === 'online' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-indigo-600 font-medium">Amount to collect</p>
                    <p className="text-3xl font-bold text-indigo-700 mt-1">
                      ₹{parseFloat(outstanding).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-indigo-400 mt-1">UPI · Cards · Net Banking · Wallets</p>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <button
                    onClick={handleOnlinePay}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {loading ? 'Opening Razorpay…' : 'Pay with Razorpay'}
                  </button>
                  <p className="text-xs text-center text-gray-400">
                    Powered by Razorpay · 100% secure
                  </p>
                </div>
              )}

              {/* Offline tab */}
              {tab === 'offline' && (
                <form onSubmit={handleOfflinePay} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                      <input
                        type="number" step="0.01" required
                        value={offline.amount_paid}
                        onChange={e => setOffline(f => ({ ...f, amount_paid: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Method *</label>
                      <select
                        value={offline.payment_method}
                        onChange={e => setOffline(f => ({ ...f, payment_method: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                        {OFFLINE_METHODS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Reference / Transaction ID
                    </label>
                    <input
                      type="text"
                      value={offline.reference_number}
                      onChange={e => setOffline(f => ({ ...f, reference_number: e.target.value }))}
                      placeholder="Cheque no. / UTR / Transaction ID"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      rows={2} value={offline.notes}
                      onChange={e => setOffline(f => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                      className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {loading ? 'Saving…' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
