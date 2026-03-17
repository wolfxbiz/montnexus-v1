import { User, Calendar, CreditCard } from 'lucide-react'

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  partial:   'bg-blue-100 text-blue-700 border-blue-200',
  paid:      'bg-green-100 text-green-700 border-green-200',
  overdue:   'bg-red-100 text-red-600 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function InvoiceCard({ invoice, onClick }) {
  const patient = invoice.patient || {}
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{invoice.invoice_number}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <User size={11} className="text-gray-400" />
            <p className="text-xs text-gray-500">{patient.full_name || '—'}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${STATUS_STYLES[invoice.payment_status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          {invoice.payment_status}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={11} className="shrink-0" />
          {invoice.issue_date}
          {invoice.due_date && <span className="text-gray-400">· Due {invoice.due_date}</span>}
        </div>
        {invoice.payment_method && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CreditCard size={11} className="shrink-0" />
            {invoice.payment_method}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">Total</span>
        <span className="text-base font-bold text-gray-800">
          ₹{parseFloat(invoice.total_amount || 0).toLocaleString()}
        </span>
      </div>
    </div>
  )
}
