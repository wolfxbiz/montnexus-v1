import { useEffect, useState } from 'react'
import { Plus, RefreshCw, X, Trash2 } from 'lucide-react'
import apiClient from '../../lib/apiClient'

const CATEGORIES = ['All', 'Supplies', 'Utilities', 'Salary', 'Rent', 'Equipment', 'Maintenance', 'Other']

export default function ExpensePage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [showForm, setShowForm] = useState(false)

  async function fetchExpenses() {
    setLoading(true)
    try {
      const params = category !== 'All' ? `?category=${category}` : ''
      const { data } = await apiClient.get(`/api/finance/expenses/${params}`)
      setExpenses(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchExpenses() }, [category])

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return
    try {
      await apiClient.delete(`/api/finance/expenses/${id}/`)
      fetchExpenses()
    } catch {}
  }

  const monthTotal = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Expenses</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {expenses.length} records · Total: ₹{monthTotal.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchExpenses}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Log Expense
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${category === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">No expenses found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Paid To</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{exp.expense_date}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-48 truncate">{exp.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{exp.paid_to || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ₹{parseFloat(exp.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(exp.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-100">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-800">₹{monthTotal.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {showForm && (
        <AddExpenseModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchExpenses() }}
        />
      )}
    </div>
  )
}

function AddExpenseModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    category: 'Supplies', description: '', amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    paid_to: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiClient.post('/api/finance/expenses/', {
        ...form, amount: parseFloat(form.amount),
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Log Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <select name="category" required value={form.category} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
              <input name="amount" required type="number" step="0.01" value={form.amount} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input name="description" value={form.description} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="What was this for?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input name="expense_date" type="date" value={form.expense_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Paid To</label>
              <input name="paid_to" value={form.paid_to} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Vendor / person" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
