import { useEffect, useState } from 'react'
import { LayoutList, CalendarDays, Plus, RefreshCw, Send } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import AppointmentCard from './AppointmentCard'
import AppointmentForm from './AppointmentForm'
import AppointmentCalendar from './AppointmentCalendar'
import VisitRecordForm from './VisitRecordForm'
import InvoiceForm from '../finance/InvoiceForm'

const STATUS_FILTERS = ['all', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)       // appointment being edited
  const [showVisit, setShowVisit] = useState(false)    // visit record modal
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false) // post-visit invoice prompt
  const [weekStart, setWeekStart] = useState(new Date())

  async function fetchAppointments() {
    setLoading(true)
    setError('')
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const { data } = await apiClient.get(`/api/crm/appointments/${params}`)
      setAppointments(data)
    } catch {
      setError('Failed to load appointments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointments() }, [statusFilter])

  function handleSlotClick(dateStr, appt) {
    if (appt) {
      setSelected(appt)
    } else {
      setShowForm(true)
    }
  }

  function handleStatusUpdate(appt) {
    setSelected(appt)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Appointments</h2>
          <p className="text-sm text-gray-400 mt-0.5">{appointments.length} appointments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAppointments}
            className="p-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <LayoutList size={13} /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'calendar' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <CalendarDays size={13} /> Week
            </button>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : view === 'calendar' ? (
        <AppointmentCalendar
          appointments={appointments}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          onSlotClick={handleSlotClick}
        />
      ) : appointments.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No appointments found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map(a => (
            <AppointmentCard key={a.id} appointment={a} onClick={() => setSelected(a)} />
          ))}
        </div>
      )}

      {/* Appointment detail / edit modal */}
      {selected && (
        <AppointmentDetailModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchAppointments() }}
          onCreateVisit={() => { setShowVisit(true) }}
        />
      )}

      {showForm && (
        <AppointmentForm
          onClose={() => setShowForm(false)}
          onSaved={fetchAppointments}
        />
      )}

      {showVisit && selected && (
        <VisitRecordForm
          appointment={selected}
          onClose={() => { setShowVisit(false); setSelected(null) }}
          onSaved={() => {
            setShowVisit(false)
            fetchAppointments()
            // Show invoice prompt — keep selected intact for pre-fill
            setShowInvoicePrompt(true)
          }}
        />
      )}

      {/* Post-visit invoice prompt */}
      {showInvoicePrompt && selected && (
        <InvoicePromptModal
          appointment={selected}
          onSkip={() => { setShowInvoicePrompt(false); setSelected(null) }}
          onDone={() => { setShowInvoicePrompt(false); setSelected(null) }}
        />
      )}
    </div>
  )
}

// ── Post-visit invoice prompt ─────────────────────────────
function InvoicePromptModal({ appointment, onSkip, onDone }) {
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)

  if (showInvoiceForm) {
    return (
      <InvoiceForm
        defaultPatient={appointment.patient}
        defaultAppointmentId={appointment.id}
        onClose={onSkip}
        onSaved={onDone}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <span className="text-green-600 text-xl">✓</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">Visit Recorded</h3>
          <p className="text-sm text-gray-500 mt-1">Would you like to create an invoice for this appointment?</p>
          <p className="text-xs text-gray-400 mt-1">Patient: {appointment.patient?.full_name}</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onSkip}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Skip
          </button>
          <button onClick={() => setShowInvoiceForm(true)}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Appointment detail modal ──────────────────────────────
function AppointmentDetailModal({ appointment, onClose, onSaved, onCreateVisit }) {
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [reminderMsg, setReminderMsg] = useState('')

  async function handleSendReminder(type = 'reminder') {
    setSending(true)
    setReminderMsg('')
    try {
      const { data } = await apiClient.post(
        `/api/crm/appointments/${appointment.id}/send-reminder/`,
        { type }
      )
      setReminderMsg(data.message || 'Sent!')
    } catch (err) {
      setReminderMsg(err.response?.data?.error || 'Failed to send WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  const STATUS_STYLES = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
    no_show: 'bg-yellow-100 text-yellow-700',
  }

  if (editing) {
    return <AppointmentForm appointment={appointment} onClose={() => setEditing(false)} onSaved={onSaved} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Appointment Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Patient</span>
            <span className="font-medium text-gray-800">{appointment.patient?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Doctor</span>
            <span className="font-medium text-gray-800">Dr. {appointment.doctor?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date & Time</span>
            <span className="font-medium text-gray-800">
              {appointment.appointment_date} at {appointment.appointment_time?.slice(0, 5)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="capitalize text-gray-700">{appointment.type?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[appointment.status]}`}>
              {appointment.status}
            </span>
          </div>
          {appointment.reason && (
            <div>
              <p className="text-gray-500 mb-1">Reason</p>
              <p className="text-gray-700">{appointment.reason}</p>
            </div>
          )}
        </div>
        {reminderMsg && (
          <p className="px-6 pb-2 text-xs text-center text-indigo-600">{reminderMsg}</p>
        )}
        <div className="px-6 pb-5 flex gap-2 flex-wrap">
          <button onClick={() => setEditing(true)}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Edit
          </button>
          {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
            <button onClick={() => handleSendReminder('reminder')} disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 border border-green-200 text-green-700 py-2 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50 transition-colors">
              <Send size={13} /> {sending ? 'Sending…' : 'Send Reminder'}
            </button>
          )}
          {appointment.status === 'confirmed' && (
            <button onClick={onCreateVisit}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Complete + Visit Record
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
