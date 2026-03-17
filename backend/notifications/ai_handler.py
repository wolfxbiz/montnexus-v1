"""
Rule-based intent classifier and response generator.
Phase 2: swap classify_intent() internals for an LLM/SLM call.
"""


def classify_intent(message: str) -> str:
    """Returns one of: 'appointment', 'query', 'unknown'"""
    lower = message.lower()
    if any(kw in lower for kw in ('appointment', 'book', 'schedule', 'reschedule', 'cancel')):
        return 'appointment'
    if any(kw in lower for kw in ('hour', 'open', 'location', 'address', 'contact', 'phone')):
        return 'query'
    return 'unknown'


RESPONSES = {
    'appointment': (
        'To book or change an appointment, please call our front desk or visit our portal. '
        'A staff member will confirm your slot shortly.'
    ),
    'query': (
        'Our clinic is open Monday–Friday 8am–6pm and Saturday 9am–1pm. '
        'For more info, visit our website or call the front desk.'
    ),
    'unknown': (
        'Thank you for your message. A staff member will get back to you soon.'
    ),
}


def handle_message(parsed: dict) -> str:
    """
    Takes a parsed message dict from WhatsAppService.parse_incoming()
    and returns the response text to send back.
    """
    intent = classify_intent(parsed.get('message', ''))
    return RESPONSES[intent]
