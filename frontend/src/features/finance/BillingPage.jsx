import { useEffect, useState } from 'react'
import { Plus, RefreshCw, X, CreditCard } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import InvoiceCard from './InvoiceCard'
import InvoiceForm from './InvoiceForm'
import PaymentTracker from './PaymentTracker'
import PaymentModal from './PaymentModal'

const STATUS_FILTERS = ['all', 'pending', 'partial', 'paid', 'overdue', 'cancelled']

export default function BillingPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)   // invoice detail modal
  const [invoiceDetail, setInvoiceDetail] = useState(null)
  const [summary, setSummary] = useState(null)

  async function fetchInvoices() {
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const { data } = await apiClient.get(`/api/finance/invoices/${params}`)
      setInvoices(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function fetchSummary() {
    try {
      const { data } = await apiClient.get('/api/finance/summary/')
      setSummary(data)
    } catch {}
  }

  useEffect(() => { fetchInvoices(); fetchSummary() }, [statusFilter])

  async function openDetail(invoice) {
    setSelected(invoice)
    try {
      const { data } = await apiClient.get(`/api/finance/invoices/${invoice.id}/`)
      setInvoiceDetail(data)
    } catch {}
  }

  const filtered = invoices.filter(inv => {
    if (!search) return true
    const q = search.toLowerCase()
    return inv.invoice_number?.toLowerCase().includes(q) ||
      inv.patient?.full_name?.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Billing</h2>
          <p className="text-sm text-gray-400 mt-0.5">{invoices.length} invoices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchInvoices(); fetchSummary() }}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Collection", value: summary.today?.collected, color: 'text-green-700' },
            { label: "Today's Invoiced",   value: summary.today?.invoiced,  color: 'text-gray-800' },
            { label: 'This Month Net',     value: summary.this_month?.net,  color: 'text-indigo-700' },
            { label: 'Outstanding',        value: summary.outstanding,      color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>₹{parseFloat(value || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by patient or invoice #…"
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-64" />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No invoices found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inv => (
            <InvoiceCard key={inv.id} invoice={inv} onClick={() => openDetail(inv)} />
          ))}
        </div>
      )}

      {/* New invoice modal */}
      {showForm && (
        <InvoiceForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchInvoices(); fetchSummary() }}
        />
      )}

      {/* Invoice detail modal */}
      {selected && (
        <InvoiceDetailModal
          invoice={invoiceDetail || selected}
          onClose={() => { setSelected(null); setInvoiceDetail(null) }}
          onSaved={() => { openDetail(selected); fetchInvoices(); fetchSummary() }}
        />
      )}
    </div>
  )
}

// ── Invoice Detail Modal ─────────────────────────────────────
function InvoiceDetailModal({ invoice, onClose, onSaved }) {
  const [showPayment, setShowPayment] = useState(false)
  const patient = invoice.patient || {}
  const items = invoice.items || []
  const payments = invoice.payments || []
  const isPaid = invoice.payment_status === 'paid' || invoice.payment_status === 'cancelled'

  const STATUS_STYLES = {
    pending:   'bg-yellow-100 text-yellow-700',
    partial:   'bg-blue-100 text-blue-700',
    paid:      'bg-green-100 text-green-700',
    overdue:   'bg-red-100 text-red-600',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{invoice.invoice_number}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{patient.full_name} · {invoice.issue_date}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[invoice.payment_status] || 'bg-gray-100 text-gray-500'}`}>
              {invoice.payment_status}
            </span>
            {!isPaid && (
              <button
                onClick={() => setShowPayment(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <CreditCard size={12} /> Collect Payment
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Line items */}
          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center px-3 py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-700">{item.description}</p>
                      <p className="text-xs text-gray-400">{item.quantity} × ₹{parseFloat(item.unit_price).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-800">₹{parseFloat(item.total || 0).toLocaleString()}</p>
                  </div>
                ))}
                <div className="px-3 py-2 bg-gray-50 flex justify-between">
                  <span className="text-sm font-semibold text-gray-700">Grand Total</span>
                  <span className="text-sm font-bold text-gray-800">₹{parseFloat(invoice.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment tracker */}
          <PaymentTracker invoice={invoice} payments={payments} onSaved={onSaved} />
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPayment(false)}
          onPaid={() => { setShowPayment(false); onSaved() }}
        />
      )}
    </div>
  )
}
