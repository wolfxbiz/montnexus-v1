import { HeartPulse, Phone, Calendar, Droplets } from 'lucide-react'

const GENDER_COLORS = { male: 'text-blue-500 bg-blue-50', female: 'text-pink-500 bg-pink-50', other: 'text-purple-500 bg-purple-50' }

export default function PatientCard({ patient, onClick }) {
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <HeartPulse size={15} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{patient.full_name}</p>
            {age && <p className="text-xs text-gray-400">{age} yrs</p>}
          </div>
        </div>
        {patient.gender && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${GENDER_COLORS[patient.gender] || 'bg-gray-100 text-gray-500'}`}>
            {patient.gender}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {patient.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone size={11} className="shrink-0" />
            {patient.phone}
          </div>
        )}
        {patient.blood_group && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Droplets size={11} className="shrink-0 text-red-400" />
            {patient.blood_group}
          </div>
        )}
        {patient.assigned_doctor?.full_name && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={11} className="shrink-0" />
            Dr. {patient.assigned_doctor.full_name}
          </div>
        )}
      </div>
    </div>
  )
}
