import { useState, useEffect } from 'react'
import { X, Minus } from 'lucide-react'
import apiClient from '../../lib/apiClient'

export default function VisitRecordForm({ appointment, onClose, onSaved }) {
  const [form, setForm] = useState({
    diagnosis: '',
    prescription: '',
    follow_up_date: '',
  })
  const [inventoryItems, setInventoryItems] = useState([])
  const [suppliesUsed, setSuppliesUsed] = useState([]) // [{ item_id, name, quantity }]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get('/api/inventory/items/').then(r => setInventoryItems(r.data || [])).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function addSupply(itemId) {
    if (!itemId) return
    const item = inventoryItems.find(i => i.id === itemId)
    if (!item) return
    if (suppliesUsed.find(s => s.item_id === itemId)) return
    setSuppliesUsed(prev => [...prev, { item_id: itemId, name: item.name, quantity: 1 }])
  }

  function updateSupplyQty(itemId, qty) {
    setSuppliesUsed(prev => prev.map(s => s.item_id === itemId ? { ...s, quantity: Math.max(1, parseInt(qty) || 1) } : s))
  }

  function removeSupply(itemId) {
    setSuppliesUsed(prev => prev.filter(s => s.item_id !== itemId))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiClient.post('/api/crm/visits/', {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id || appointment.patient?.id,
        doctor_id: appointment.doctor_id || appointment.doctor?.id,
        ...form,
        follow_up_date: form.follow_up_date || null,
      })

      // Fire-and-forget inventory consume transactions
      for (const supply of suppliesUsed) {
        apiClient.post('/api/inventory/transactions/', {
          item_id: supply.item_id,
          transaction_type: 'consume',
          quantity: supply.quantity,
          notes: `Used during visit — ${appointment.patient?.full_name} on ${appointment.appointment_date}`,
        }).catch(() => {})
      }

      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save visit record.')
    } finally {
      setLoading(false)
    }
  }

  const availableItems = inventoryItems.filter(i => !suppliesUsed.find(s => s.item_id === i.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Visit Record</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appointment.patient?.full_name} · {appointment.appointment_date}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis</label>
            <textarea name="diagnosis" value={form.diagnosis} onChange={handleChange} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="Diagnosis and clinical findings…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prescription</label>
            <textarea name="prescription" value={form.prescription} onChange={handleChange} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="Medications, dosage, instructions…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
            <input name="follow_up_date" type="date" value={form.follow_up_date} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* Supplies used */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supplies Used</label>
            {suppliesUsed.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {suppliesUsed.map(s => (
                  <div key={s.item_id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                    <input
                      type="number" min="1" value={s.quantity}
                      onChange={e => updateSupplyQty(s.item_id, e.target.value)}
                      className="w-14 border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <button type="button" onClick={() => removeSupply(s.item_id)}
                      className="text-gray-300 hover:text-red-400 transition-colors">
                      <Minus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={e => addSupply(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-500">
              <option value="">+ Add supply item…</option>
              {availableItems.map(i => (
                <option key={i.id} value={i.id}>{i.name} (stock: {i.current_stock} {i.unit})</option>
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
              {loading ? 'Saving…' : 'Save Visit Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
