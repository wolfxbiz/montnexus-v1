import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import apiClient from '../../lib/apiClient'

export default function StockAlertPanel({ compact = false }) {
  const [lowStock, setLowStock] = useState([])
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchAlerts() {
    setLoading(true)
    try {
      const [lowRes, expRes] = await Promise.all([
        apiClient.get('/api/inventory/alerts/'),
        apiClient.get('/api/inventory/expiring/'),
      ])
      setLowStock(lowRes.data || [])
      setExpiring(expRes.data || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  async function handleRestock(item) {
    const qty = prompt(`Restock "${item.name}"\nEnter quantity to add:`)
    if (!qty || isNaN(parseInt(qty))) return
    try {
      await apiClient.post('/api/inventory/transactions/', {
        item_id: item.id,
        transaction_type: 'restock',
        quantity: parseInt(qty),
        notes: 'Restocked from alert panel',
      })
      fetchAlerts()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restock.')
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-gray-400">Loading alerts…</div>
  }

  const totalAlerts = lowStock.length + expiring.length

  if (compact) {
    // Widget mode for dashboard
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Stock Alerts</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${totalAlerts > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
          </span>
        </div>
        {totalAlerts === 0 ? (
          <p className="text-xs text-gray-400">All stock levels are healthy.</p>
        ) : (
          <div className="space-y-1.5">
            {lowStock.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-yellow-700">
                  <AlertTriangle size={11} />
                  <span className="truncate max-w-32">{item.name}</span>
                </div>
                <span className="text-red-600 font-medium">{item.current_stock} left</span>
              </div>
            ))}
            {totalAlerts > 3 && (
              <p className="text-xs text-gray-400">+{totalAlerts - 3} more alerts</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Stock Alerts</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {lowStock.length} low-stock · {expiring.length} expiring soon
          </p>
        </div>
        <button onClick={fetchAlerts}
          className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Low stock */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-yellow-500" />
          <h3 className="text-sm font-semibold text-gray-700">Low Stock ({lowStock.length})</h3>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">All items above minimum stock.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Item</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Category</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Current</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Minimum</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lowStock.map(item => (
                  <tr key={item.id} className={item.current_stock <= 0 ? 'bg-red-50' : 'bg-yellow-50/40'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.category}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-600">
                      {item.current_stock} {item.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{item.minimum_stock}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => handleRestock(item)}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expiring */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">Expiring Within 30 Days ({expiring.length})</h3>
        </div>
        {expiring.length === 0 ? (
          <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">No items expiring soon.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Item</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Category</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Stock</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Expires</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expiring.map(item => (
                  <tr key={item.id} className="bg-orange-50/40">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.category}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{item.current_stock} {item.unit}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-orange-600">{item.expiry_date}</td>
                    <td className="px-4 py-2.5 text-gray-400">{item.storage_location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
