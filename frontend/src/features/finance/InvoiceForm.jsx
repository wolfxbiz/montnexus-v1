import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import apiClient from '../../lib/apiClient'

export default function InvoiceForm({ defaultPatient, defaultAppointmentId, onClose, onSaved }) {
  const [patients, setPatients] = useState([])
  const [form, setForm] = useState({
    patient_id: defaultPatient?.id || '',
    appointment_id: defaultAppointmentId || '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_percent: 0,
    discount_amount: 0,
    payment_method: 'cash',
    notes: '',
  })
  const [items, setItems] = useState([
    { description: 'Consultation Fee', quantity: 1, unit_price: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get('/api/crm/patients/').then(r => setPatients(r.data || [])).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleItemChange(i, field, value) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: '' }])
  }

  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const subtotal = items.reduce((s, item) => {
    return s + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1)
  }, 0)
  const taxAmount = subtotal * (parseFloat(form.tax_percent) || 0) / 100
  const total = subtotal + taxAmount - (parseFloat(form.discount_amount) || 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Create invoice
      const { data: inv } = await apiClient.post('/api/finance/invoices/', {
        ...form,
        subtotal,
        tax_percent: parseFloat(form.tax_percent) || 0,
        discount_amount: parseFloat(form.discount_amount) || 0,
      })

      // Add line items
      for (const item of items) {
        if (item.description && item.unit_price) {
          await apiClient.post(`/api/finance/invoices/${inv.id}/items/`, {
            invoice_id: inv.id,
            description: item.description,
            quantity: parseInt(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price),
          })
        }
      }
      onSaved(inv)
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to create invoice.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">New Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Patient */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Patient *</label>
            {defaultPatient ? (
              <input readOnly value={defaultPatient.full_name}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
            ) : (
              <select name="patient_id" required value={form.patient_id} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
              <input name="issue_date" type="date" value={form.issue_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input name="due_date" type="date" value={form.due_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Line Items</label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-3 text-right">Unit Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 items-center px-3 py-2 border-t border-gray-100 gap-1">
                  <input
                    value={item.description}
                    onChange={e => handleItemChange(i, 'description', e.target.value)}
                    placeholder="Service description"
                    className="col-span-5 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1" />
                  <input
                    type="number" min="1" value={item.quantity}
                    onChange={e => handleItemChange(i, 'quantity', e.target.value)}
                    className="col-span-2 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1" />
                  <input
                    type="number" step="0.01" value={item.unit_price}
                    onChange={e => handleItemChange(i, 'unit_price', e.target.value)}
                    placeholder="0.00"
                    className="col-span-3 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1" />
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <span className="text-sm text-gray-600">
                      ₹{((parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1)).toLocaleString()}
                    </span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)}>
                        <Trash2 size={12} className="text-gray-300 hover:text-red-400 transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tax (%)</label>
              <input name="tax_percent" type="number" step="0.01" value={form.tax_percent} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount (₹)</label>
              <input name="discount_amount" type="number" step="0.01" value={form.discount_amount} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Grand total */}
          <div className="bg-indigo-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-700">Grand Total</span>
            <span className="text-xl font-bold text-indigo-800">₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
            <select name="payment_method" value={form.payment_method} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              {['cash', 'card', 'upi', 'insurance', 'other'].map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Creating…' : 'Issue Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
