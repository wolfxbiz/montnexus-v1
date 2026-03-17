import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Search, RefreshCw } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import PatientCard from './PatientCard'
import PatientForm from './PatientForm'

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function fetchPatients() {
    setLoading(true)
    setError('')
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const { data } = await apiClient.get(`/api/crm/patients/${params}`)
      setPatients(data)
    } catch {
      setError('Failed to load patients.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  function handleSearch(e) {
    e.preventDefault()
    fetchPatients()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Patients</h2>
          <p className="text-sm text-gray-400 mt-0.5">{patients.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPatients}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <UserPlus size={14} /> Add Patient
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button type="submit"
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
          Search
        </button>
      </form>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading patients…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : patients.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No patients found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {patients.map(p => (
            <PatientCard key={p.id} patient={p} onClick={() => navigate(`/crm/patients/${p.id}`)} />
          ))}
        </div>
      )}

      {showForm && (
        <PatientForm onClose={() => setShowForm(false)} onSaved={fetchPatients} />
      )}
    </div>
  )
}
