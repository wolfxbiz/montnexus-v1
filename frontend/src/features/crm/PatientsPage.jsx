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

  const [filters, setFilters] = useState({ 
    doctor_id: '', gender: '', blood_group: '', 
    registered_timeframe: '', min_age: '', max_age: '', is_dormant: '' 
  })
  const [showFilters, setShowFilters] = useState(false)
  const [doctors, setDoctors] = useState([])

  useEffect(() => {
    apiClient.get('/api/users/').then(r => setDoctors(r.data || [])).catch(() => {})
  }, [])

  async function fetchPatients() {
    setLoading(true)
    setError('')
    try {
      const p = new URLSearchParams()
      if (search) p.append('search', search)
      if (filters.doctor_id) p.append('doctor_id', filters.doctor_id)
      if (filters.gender) p.append('gender', filters.gender)
      if (filters.blood_group) p.append('blood_group', filters.blood_group)
      
      if (filters.registered_timeframe) {
        const days = parseInt(filters.registered_timeframe)
        const d = new Date()
        d.setDate(d.getDate() - days)
        p.append('registered_after', d.toISOString())
      }
      if (filters.min_age) p.append('min_age', filters.min_age)
      if (filters.max_age) p.append('max_age', filters.max_age)
      if (filters.is_dormant) p.append('is_dormant', filters.is_dormant)
      
      const q = p.toString() ? `?${p.toString()}` : ''
      const { data } = await apiClient.get(`/api/crm/patients/${q}`)
      setPatients(data)
    } catch {
      setError('Failed to load patients.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPatients()
    }, 300)
    return () => clearTimeout(delay)
  }, [search, filters])

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

      {/* Search & Filters Toggle */}
      <div className="flex gap-2">
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
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Doctor</label>
            <select
              value={filters.doctor_id}
              onChange={e => setFilters({...filters, doctor_id: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">All Doctors</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
            <select
              value={filters.gender}
              onChange={e => setFilters({...filters, gender: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
            <select
              value={filters.blood_group}
              onChange={e => setFilters({...filters, blood_group: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Registration Date</label>
            <select
              value={filters.registered_timeframe}
              onChange={e => setFilters({...filters, registered_timeframe: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">Any Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Age Range</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" placeholder="Min" value={filters.min_age} onChange={e => setFilters({...filters, min_age: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <span className="text-gray-400">-</span>
              <input type="number" min="0" placeholder="Max" value={filters.max_age} onChange={e => setFilters({...filters, max_age: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-5 md:col-span-3 border-t border-gray-50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.is_dormant === 'true'} onChange={e => setFilters({...filters, is_dormant: e.target.checked ? 'true' : ''})} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Dormant (&gt;6 mo no visit)</span>
            </label>
            <button
              onClick={() => {
                setFilters({ doctor_id: '', gender: '', blood_group: '', registered_timeframe: '', min_age: '', max_age: '', is_dormant: '' })
              }}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

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
