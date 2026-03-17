import { useEffect, useState } from 'react'
import { Plus, RefreshCw, X } from 'lucide-react'
import apiClient from '../../lib/apiClient'

const STATUS_STYLES = {
  active:             'bg-green-100 text-green-700',
  under_maintenance:  'bg-yellow-100 text-yellow-700',
  retired:            'bg-gray-100 text-gray-500',
  lost:               'bg-red-100 text-red-600',
}

const STATUS_FILTERS = ['all', 'active', 'under_maintenance', 'retired', 'lost']

export default function AssetPage() {
  const [assets, setAssets] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)

  async function fetchAssets() {
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const { data } = await apiClient.get(`/api/inventory/assets/${params}`)
      setAssets(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
    apiClient.get('/api/users/').then(r => setProfiles(r.data || [])).catch(() => {})
  }, [statusFilter])

  async function handleStatusChange(asset, newStatus) {
    try {
      await apiClient.patch(`/api/inventory/assets/${asset.id}/`, { status: newStatus })
      fetchAssets()
    } catch {}
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Assets</h2>
          <p className="text-sm text-gray-400 mt-0.5">{assets.length} assets registered</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAssets}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Add Asset
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">No assets found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Asset</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tag / Serial</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Warranty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assets.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{asset.name}</p>
                    <p className="text-xs text-gray-400">{asset.category}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <p>{asset.asset_tag || '—'}</p>
                    {asset.serial_number && <p className="text-xs text-gray-400">{asset.serial_number}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {asset.assigned_to_profile?.full_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{asset.location || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {asset.warranty_expiry
                      ? <span className={new Date(asset.warranty_expiry) < new Date() ? 'text-red-500' : ''}>{asset.warranty_expiry}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[asset.status] || 'bg-gray-100 text-gray-500'}`}>
                      {asset.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(asset)}
                      className="text-xs text-indigo-600 hover:underline font-medium">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AddAssetModal
          profiles={profiles}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchAssets() }}
        />
      )}

      {selected && (
        <ManageAssetModal
          asset={selected}
          profiles={profiles}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchAssets() }}
        />
      )}
    </div>
  )
}

// ── Add Asset Modal ──────────────────────────────────────────
function AddAssetModal({ profiles, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', category: 'Medical Equipment', asset_tag: '', serial_number: '',
    purchase_date: '', purchase_cost: '', assigned_to: '', location: '',
    warranty_expiry: '', notes: '',
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
      await apiClient.post('/api/inventory/assets/', {
        ...form,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
        purchase_date: form.purchase_date || null,
        warranty_expiry: form.warranty_expiry || null,
        assigned_to: form.assigned_to || null,
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-800">Register Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset Name *</label>
            <input name="name" required value={form.name} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. ECG Machine" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <input name="category" value={form.category} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asset Tag</label>
              <input name="asset_tag" value={form.asset_tag} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="e.g. AST-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date</label>
              <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Cost (₹)</label>
              <input name="purchase_cost" type="number" value={form.purchase_cost} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assign To</label>
              <select name="assigned_to" value={form.assigned_to} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input name="location" value={form.location} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Room / department" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Expiry</label>
            <input name="warranty_expiry" type="date" value={form.warranty_expiry} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Manage Asset Modal ───────────────────────────────────────
function ManageAssetModal({ asset, profiles, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: asset.status || 'active',
    assigned_to: asset.assigned_to || '',
    location: asset.location || '',
    notes: asset.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiClient.patch(`/api/inventory/assets/${asset.id}/`, {
        ...form,
        assigned_to: form.assigned_to || null,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Manage — {asset.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="active">Active</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="retired">Retired</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assign To</label>
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Room / department" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
