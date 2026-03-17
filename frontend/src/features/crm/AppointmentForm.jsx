import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import apiClient from '../../lib/apiClient'

export default function AppointmentForm({ defaultPatientId, defaultPatientName, appointment, onClose, onSaved }) {
  const isEdit = !!appointment

  const [form, setForm] = useState({
    patient_id: defaultPatientId || '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 30,
    type: 'consultation',
    reason: '',
    notes: '',
    status: 'scheduled',
  })
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [conflict, setConflict] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit && appointment) {
      setForm({
        patient_id: appointment.patient_id || '',
        doctor_id: appointment.doctor_id || '',
        appointment_date: appointment.appointment_date || '',
        appointment_time: appointment.appointment_time?.slice(0, 5) || '',
        duration_minutes: appointment.duration_minutes || 30,
        type: appointment.type || 'consultation',
        reason: appointment.reason || '',
        notes: appointment.notes || '',
        status: appointment.status || 'scheduled',
      })
    }
    Promise.all([
      apiClient.get('/api/crm/patients/'),
      apiClient.get('/api/users/'),
    ]).then(([pRes, dRes]) => {
      setPatients(pRes.data || [])
      setDoctors(dRes.data || [])
    }).catch(() => {})
  }, [])

  function handleChange(e) {
    setConflict(false)
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setConflict(false)
    setLoading(true)
    try {
      if (isEdit) {
        await apiClient.patch(`/api/crm/appointments/${appointment.id}/`, form)
      } else {
        await apiClient.post('/api/crm/appointments/', form)
      }
      onSaved()
      onClose()
    } catch (err) {
      if (err.response?.status === 409) {
        setConflict(true)
      } else {
        setError(err.response?.data?.error || 'Failed to save appointment.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {isEdit ? 'Edit Appointment' : 'Book Appointment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Patient */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Patient *</label>
            {defaultPatientId ? (
              <input readOnly value={defaultPatientName || defaultPatientId}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
            ) : (
              <select name="patient_id" required value={form.patient_id} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Doctor *</label>
            <select name="doctor_id" required value={form.doctor_id} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Select doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input name="appointment_date" type="date" required value={form.appointment_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
              <input name="appointment_time" type="time" required value={form.appointment_time} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Type + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select name="type" value={form.type} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="procedure">Procedure</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
              <select name="duration_minutes" value={form.duration_minutes} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <input name="reason" value={form.reason} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Reason for visit" />
          </div>

          {/* Conflict warning */}
          {conflict && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                This doctor already has an appointment at the selected time. Please choose a different time.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
