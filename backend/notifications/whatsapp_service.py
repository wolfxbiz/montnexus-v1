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
