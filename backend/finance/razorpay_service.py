import razorpay
import hmac
import hashlib
from django.conf import settings


class RazorpayService:
    """Razorpay payment gateway wrapper."""

    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    def create_order(self, amount_rupees: float, currency: str = 'INR',
                     receipt: str = None, notes: dict = None) -> dict:
        """
        Create a Razorpay order.
        amount_rupees: amount in rupees (will be converted to paise internally).
        Returns the Razorpay order dict.
        """
        amount_paise = int(round(amount_rupees * 100))
        data = {
            'amount': amount_paise,
            'currency': currency,
            'receipt': receipt or '',
            'notes': notes or {},
        }
        return self.client.order.create(data=data)

    def verify_payment(self, razorpay_order_id: str,
                       razorpay_payment_id: str,
                       razorpay_signature: str) -> bool:
        """
        Verify the payment signature returned by Razorpay checkout.
        Returns True if valid, False otherwise.
        """
        try:
            self.client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
            })
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

    def fetch_payment(self, payment_id: str) -> dict:
        """Fetch payment details from Razorpay."""
        return self.client.payment.fetch(payment_id)
