import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

// Client-side preview of the AI handler's rule-based responses.
// In production, messages go via WhatsApp — this widget is for in-app support preview.
function getAutoReply(message) {
  const lower = message.toLowerCase()
  if (/appointment|book|schedule|reschedule|cancel/.test(lower))
    return 'To book or change an appointment, please call our front desk or use the portal. A staff member will confirm your slot shortly.'
  if (/hour|open|location|address|contact|phone/.test(lower))
    return 'Our clinic is open Monday–Friday 8am–6pm and Saturday 9am–1pm. For more info, call the front desk.'
  return 'Thank you for your message. A staff member will get back to you soon.'
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setMessages(m => [...m, { from: 'user', text }])
    setInput('')
    setTimeout(() => {
      setMessages(m => [...m, { from: 'bot', text: getAutoReply(text) }])
    }, 600)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat window */}
      {open && (
        <div className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
            <span className="text-sm font-semibold text-white">Support Chat</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-gray-900 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <button type="submit" className="text-gray-500 hover:text-gray-800 transition-colors">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-11 h-11 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>
    </div>
  )
}
