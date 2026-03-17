import requests
from django.conf import settings


class WhatsAppService:
    """Standalone WhatsApp Business API wrapper. Drop into any project."""

    def __init__(self):
        self.api_url = settings.WHATSAPP_API_URL
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.phone_id = settings.WHATSAPP_PHONE_ID
        self.headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
        }

    def send_message(self, to: str, message: str) -> dict:
        """Send a plain text WhatsApp message."""
        url = f'{self.api_url}/{self.phone_id}/messages'
        payload = {
            'messaging_product': 'whatsapp',
            'to': to,
            'type': 'text',
            'text': {'body': message},
        }
        response = requests.post(url, json=payload, headers=self.headers, timeout=10)
        response.raise_for_status()
        return response.json()

    def send_template(self, to: str, template_name: str, params: list) -> dict:
        """Send a pre-approved WhatsApp template message."""
        url = f'{self.api_url}/{self.phone_id}/messages'
        components = []
        if params:
            components.append({
                'type': 'body',
                'parameters': [{'type': 'text', 'text': p} for p in params],
            })
        payload = {
            'messaging_product': 'whatsapp',
            'to': to,
            'type': 'template',
            'template': {
                'name': template_name,
                'language': {'code': 'en_US'},
                'components': components,
            },
        }
        response = requests.post(url, json=payload, headers=self.headers, timeout=10)
        response.raise_for_status()
        return response.json()

    # ── Appointment templates ──────────────────────────────────

    def send_appointment_confirmation(self, to: str, doctor_name: str,
                                       appt_date: str, appt_time: str) -> dict:
        """Appointment booked — send confirmation to patient."""
        message = (
            f"Your appointment with Dr. {doctor_name} is confirmed for "
            f"{appt_date} at {appt_time}. Please arrive 10 minutes early."
        )
        return self.send_message(to, message)

    def send_appointment_reminder(self, to: str, appt_time: str) -> dict:
        """Day-before reminder — send to patient."""
        message = (
            f"Reminder: Your appointment is tomorrow at {appt_time}. "
            f"Reply CONFIRM to confirm or CANCEL to cancel."
        )
        return self.send_message(to, message)

    def send_appointment_cancellation(self, to: str, appt_date: str) -> dict:
        """Appointment cancelled — notify patient."""
        message = (
            f"Your appointment on {appt_date} has been cancelled. "
            f"Please contact us to rebook."
        )
        return self.send_message(to, message)

    def parse_incoming(self, payload: dict) -> dict:
        """
        Extract message details from a WhatsApp webhook POST payload.
        Returns: { from, message, type }
        """
        try:
            entry = payload['entry'][0]
            change = entry['changes'][0]['value']
            msg = change['messages'][0]
            return {
                'from': msg['from'],
                'message': msg.get('text', {}).get('body', ''),
                'type': msg.get('type', 'unknown'),
            }
        except (KeyError, IndexError):
            return {'from': '', 'message': '', 'type': 'unknown'}
