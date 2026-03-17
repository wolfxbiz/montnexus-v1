import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Phone, Mail, MapPin, Droplets, AlertCircle, Plus } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import PatientForm from './PatientForm'
import AppointmentForm from './AppointmentForm'

const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-yellow-100 text-yellow-700',
}

export default function PatientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showBooking, setShowBooking] = useState(false)

  async function fetchPatient() {
    try {
      const { data } = await apiClient.get(`/api/crm/patients/${id}/`)
      setPatient(data)
    } catch {
      navigate('/crm/patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatient() }, [id])

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading patient…</div>
  if (!patient) return null

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/crm/patients')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Back to Patients
        </button>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => setShowBooking(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient details */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700">
                {patient.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-800">{patient.full_name}</h2>
                <p className="text-xs text-gray-400 capitalize">
                  {patient.gender}{age ? ` · ${age} yrs` : ''}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              {patient.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={13} className="text-gray-400 shrink-0" /> {patient.phone}
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={13} className="text-gray-400 shrink-0" /> {patient.email}
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" /> {patient.address}
                </div>
              )}
              {patient.blood_group && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Droplets size={13} className="text-red-400 shrink-0" /> {patient.blood_group}
                </div>
              )}
            </div>
          </div>

          {/* Medical notes */}
          {patient.medical_notes && (
            <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-yellow-600" />
                <p className="text-xs font-semibold text-yellow-700">Medical Notes</p>
              </div>
              <p className="text-xs text-yellow-800 leading-relaxed">{patient.medical_notes}</p>
            </div>
          )}

          {/* Emergency contact */}
          {patient.emergency_contact_name && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Emergency Contact</p>
              <p className="text-sm text-gray-700">{patient.emergency_contact_name}</p>
              {patient.emergency_contact_phone && (
                <p className="text-xs text-gray-500 mt-1">{patient.emergency_contact_phone}</p>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upcoming appointments */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Appointments</h3>
            {(patient.appointments || []).length === 0 ? (
              <p className="text-xs text-gray-400">No appointments yet.</p>
            ) : (
              <div className="space-y-2">
                {patient.appointments.map(appt => (
                  <div key={appt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-700">
                        {appt.appointment_date} at {appt.appointment_time?.slice(0, 5)}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{appt.type} · {appt.reason || '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[appt.status] || 'bg-gray-100 text-gray-500'}`}>
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visit history */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Visit History</h3>
            {(patient.visit_history || []).length === 0 ? (
              <p className="text-xs text-gray-400">No visit records yet.</p>
            ) : (
              <div className="space-y-4">
                {patient.visit_history.map(visit => (
                  <div key={visit.id} className="border-l-2 border-indigo-200 pl-4 pb-4">
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(visit.visit_date).toLocaleDateString()} · Dr. {visit.doctor?.full_name}
                    </p>
                    {visit.diagnosis && (
                      <div className="mb-1">
                        <p className="text-xs font-medium text-gray-600">Diagnosis</p>
                        <p className="text-sm text-gray-700">{visit.diagnosis}</p>
                      </div>
                    )}
                    {visit.prescription && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Prescription</p>
                        <p className="text-sm text-gray-700">{visit.prescription}</p>
                      </div>
                    )}
                    {visit.follow_up_date && (
                      <p className="text-xs text-indigo-600 mt-1">Follow-up: {visit.follow_up_date}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <PatientForm patient={patient} onClose={() => setShowEdit(false)} onSaved={fetchPatient} />
      )}
      {showBooking && (
        <AppointmentForm
          defaultPatientId={patient.id}
          defaultPatientName={patient.full_name}
          onClose={() => setShowBooking(false)}
          onSaved={() => { setShowBooking(false); fetchPatient() }}
        />
      )}
    </div>
  )
}
