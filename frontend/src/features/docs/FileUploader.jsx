import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import apiClient from '../../lib/apiClient'
import { useAuth } from '../auth/useAuth'

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export default function FileUploader({ onUploaded }) {
  const { user } = useAuth()
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState([]) // [{ name, progress, error }]

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    uploadFiles(files)
  }

  function handleInputChange(e) {
    const files = Array.from(e.target.files)
    uploadFiles(files)
    e.target.value = ''
  }

  async function uploadFiles(files) {
    for (const file of files) {
      const id = crypto.randomUUID()
      setUploads(u => [...u, { id, name: file.name, progress: 0, error: '' }])

      try {
        const filePath = `${user.id}/${id}/${file.name}`

        // 1. Upload binary to Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { upsert: false })

        if (storageError) throw new Error(storageError.message)

        setUploads(u => u.map(x => x.id === id ? { ...x, progress: 60 } : x))

        // 2. Save metadata to Django
        await apiClient.post('/api/storage/files/', {
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          category: '',
          tags: [],
        })

        setUploads(u => u.map(x => x.id === id ? { ...x, progress: 100 } : x))
        setTimeout(() => {
          setUploads(u => u.filter(x => x.id !== id))
          onUploaded()
        }, 1200)
      } catch (err) {
        setUploads(u => u.map(x => x.id === id ? { ...x, error: err.message } : x))
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <UploadCloud size={28} className="text-gray-300" />
        <p className="text-sm text-gray-500">
          Drag & drop files here, or <span className="font-medium text-gray-700">click to browse</span>
        </p>
        <p className="text-xs text-gray-400">PDF, Word, Excel, PNG, JPG</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Upload progress list */}
      {uploads.map(u => (
        <div key={u.id} className="rounded-lg border border-gray-100 px-4 py-3 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-700 truncate max-w-xs">{u.name}</span>
            {u.error
              ? <span className="text-xs text-red-500">Failed</span>
              : <span className="text-xs text-gray-400">{u.progress}%</span>
            }
          </div>
          {u.error
            ? <p className="text-xs text-red-400">{u.error}</p>
            : (
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-800 rounded-full transition-all duration-500"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            )
          }
        </div>
      ))}
    </div>
  )
}
