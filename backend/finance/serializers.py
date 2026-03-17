from rest_framework import serializers


class InvoiceSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    issue_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = serializers.ChoiceField(
        choices=['pending', 'partial', 'paid', 'overdue', 'cancelled'],
        default='pending'
    )
    payment_method = serializers.ChoiceField(
        choices=['cash', 'card', 'upi', 'insurance', 'other'],
        required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class InvoiceItemSerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField()
    description = serializers.CharField()
    quantity = serializers.IntegerField(default=1, min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class PaymentSerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField()
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_date = serializers.DateTimeField(required=False, allow_null=True)
    payment_method = serializers.CharField(required=False, allow_blank=True)
    reference_number = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class ExpenseSerializer(serializers.Serializer):
    category = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    expense_date = serializers.DateField(required=False, allow_null=True)
    paid_to = serializers.CharField(required=False, allow_blank=True)
    receipt_path = serializers.CharField(required=False, allow_blank=True)
