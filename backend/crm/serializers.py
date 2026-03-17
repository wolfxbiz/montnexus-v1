from rest_framework import serializers


class PatientSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=['male', 'female', 'other'], required=False, allow_null=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    blood_group = serializers.CharField(max_length=10, required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    medical_notes = serializers.CharField(required=False, allow_blank=True)
    assigned_doctor_id = serializers.UUIDField(required=False, allow_null=True)


class AppointmentSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    doctor_id = serializers.UUIDField()
    appointment_date = serializers.DateField()
    appointment_time = serializers.TimeField()
    duration_minutes = serializers.IntegerField(default=30, min_value=5, max_value=480)
    status = serializers.ChoiceField(
        choices=['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
        default='scheduled',
    )
    type = serializers.ChoiceField(
        choices=['consultation', 'follow_up', 'procedure', 'emergency'],
        default='consultation',
    )
    reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class VisitRecordSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    patient_id = serializers.UUIDField()
    doctor_id = serializers.UUIDField()
    diagnosis = serializers.CharField(required=False, allow_blank=True)
    prescription = serializers.CharField(required=False, allow_blank=True)
    follow_up_date = serializers.DateField(required=False, allow_null=True)
    attachments = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
