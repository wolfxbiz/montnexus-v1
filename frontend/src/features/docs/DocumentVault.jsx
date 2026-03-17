import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import FileUploader from './FileUploader'
import FileCard from './FileCard'

const CATEGORIES = ['All', 'Contract', 'Medical', 'Report', 'Invoice']

export default function DocumentVault() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  async function fetchFiles() {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/api/storage/files/')
      setFiles(data)
    } catch {
      setError('Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFiles() }, [])

  function handleDeleted(id) {
    setFiles(f => f.filter(x => x.id !== id))
  }

  const filtered = files.filter(f => {
    const matchCategory = category === 'All' || f.category === category
    const matchSearch = f.file_name.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Document Vault</h2>
        <p className="text-sm text-gray-400 mt-0.5">{files.length} documents</p>
      </div>

      {/* Uploader */}
      <FileUploader onUploaded={fetchFiles} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                category === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading documents…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No documents found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(file => (
            <FileCard key={file.id} file={file} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  )
}
