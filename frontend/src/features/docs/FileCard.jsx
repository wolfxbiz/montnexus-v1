import { useState } from 'react'
import { FileText, Download, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import apiClient from '../../lib/apiClient'

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const CATEGORY_STYLES = {
  Contract: 'bg-yellow-100 text-yellow-700',
  Medical: 'bg-green-100 text-green-700',
  Report: 'bg-blue-100 text-blue-700',
  Invoice: 'bg-orange-100 text-orange-700',
}

export default function FileCard({ file, onDeleted }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDownload() {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(file.file_path, 60) // 60-second signed URL

    if (error) { alert('Could not generate download link.'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete() {
    if (!confirm(`Delete "${file.file_name}"?`)) return
    setDeleting(true)
    try {
      await apiClient.delete(`/api/storage/files/${file.id}/`)
      onDeleted(file.id)
    } catch {
      alert('Delete failed.')
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      {/* Icon + name */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <FileText size={16} className="text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{file.file_name}</p>
          <p className="text-xs text-gray-400">{formatBytes(file.file_size)}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-1.5">
        {file.category && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[file.category] || 'bg-gray-100 text-gray-500'}`}>
            {file.category}
          </span>
        )}
        {(file.tags || []).map(tag => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <span className="text-xs text-gray-400">
          {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
        </span>
        <div className="flex gap-1">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Download"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
