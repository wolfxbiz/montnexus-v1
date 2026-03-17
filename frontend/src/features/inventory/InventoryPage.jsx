import { useEffect, useState } from 'react'
import { Plus, RefreshCw, AlertTriangle, X } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import ItemCard from './ItemCard'
import ItemForm from './ItemForm'

const CATEGORIES = ['All', 'Medicine', 'Equipment', 'Consumable', 'Furniture', 'IT', 'Other']

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [detail, setDetail] = useState(null)
  const [txModal, setTxModal] = useState(null) // { item, type: 'restock'|'consume' }
  const [alertCount, setAlertCount] = useState(0)

  async function fetchItems() {
    setLoading(true)
    try {
      const params = category !== 'All' ? `?category=${category}` : ''
      const { data } = await apiClient.get(`/api/inventory/items/${params}`)
      setItems(data)
      setAlertCount(data.filter(i => i.current_stock <= i.minimum_stock).length)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [category])

  async function openDetail(item) {
    try {
      const { data } = await apiClient.get(`/api/inventory/items/${item.id}/`)
      setDetail(data)
    } catch {}
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Inventory</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {items.length} items
            {alertCount > 0 && (
              <span className="ml-2 text-yellow-600 font-medium">
                · {alertCount} low stock
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchItems}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${category === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No items found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => openDetail(item)}
              onRestock={i => setTxModal({ item: i, type: 'restock' })}
              onConsume={i => setTxModal({ item: i, type: 'consume' })}
            />
          ))}
        </div>
      )}

      {/* Add/Edit item form */}
      {(showForm || editItem) && (
        <ItemForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); fetchItems() }}
        />
      )}

      {/* Item detail modal */}
      {detail && (
        <ItemDetailModal
          item={detail}
          onClose={() => setDetail(null)}
          onEdit={i => { setDetail(null); setEditItem(i) }}
          onTransaction={() => { setDetail(null); fetchItems() }}
        />
      )}

      {/* Quick transaction modal */}
      {txModal && (
        <QuickTransactionModal
          item={txModal.item}
          type={txModal.type}
          onClose={() => setTxModal(null)}
          onSaved={() => { setTxModal(null); fetchItems() }}
        />
      )}
    </div>
  )
}

// ── Item Detail Modal ─────────────────────────────────────────
function ItemDetailModal({ item, onClose, onEdit }) {
  const transactions = item.transactions || []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{item.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.category} · {item.sku || 'No SKU'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(item)}
              className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">
              Edit
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Current Stock', `${item.current_stock} ${item.unit}`],
              ['Minimum Stock', item.minimum_stock],
              ['Unit Cost', item.unit_cost ? `₹${item.unit_cost}` : '—'],
              ['Location', item.storage_location || '—'],
              ['Supplier', item.supplier_name || '—'],
              ['Expiry', item.expiry_date || '—'],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{val}</p>
              </div>
            ))}
          </div>

          {transactions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Transactions</p>
              <div className="space-y-1.5">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <span className={`font-medium capitalize ${tx.transaction_type === 'restock' ? 'text-green-700' : 'text-red-600'}`}>
                        {tx.transaction_type}
                      </span>
                      {tx.reference && <span className="text-gray-400 ml-1">· {tx.reference}</span>}
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${tx.quantity > 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                      </span>
                      <span className="text-gray-400 ml-1">→ {tx.new_stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick Transaction Modal ──────────────────────────────────
function QuickTransactionModal({ item, type, onClose, onSaved }) {
  const [qty, setQty] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/inventory/transactions/', {
        item_id: item.id,
        transaction_type: type,
        quantity: parseInt(qty),
        reference,
      })
      if (data._alert) alert(data._alert)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record transaction.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 capitalize">
            {type} — {item.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-500">Current Stock</p>
            <p className="text-2xl font-bold text-gray-800">{item.current_stock}
              <span className="text-sm font-normal text-gray-400 ml-1">{item.unit}</span>
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Quantity to {type} *
            </label>
            <input required type="number" min="1" value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder={`Enter quantity…`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference (optional)</label>
            <input value={reference} onChange={e => setReference(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Invoice #, appointment ID…" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${type === 'restock' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
              {loading ? 'Saving…' : `Confirm ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
