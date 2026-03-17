from rest_framework import serializers


class StaffProfileSerializer(serializers.Serializer):
    profile_id = serializers.UUIDField()
    employee_id = serializers.CharField(required=False, allow_blank=True)
    designation = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    joining_date = serializers.DateField(required=False, allow_null=True)
    employment_type = serializers.ChoiceField(
        choices=['full_time', 'part_time', 'contract'], default='full_time'
    )
    salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    annual_leave_quota = serializers.IntegerField(default=14)
    sick_leave_quota = serializers.IntegerField(default=7)


class ShiftSerializer(serializers.Serializer):
    staff_id = serializers.UUIDField()
    shift_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    shift_type = serializers.ChoiceField(
        choices=['regular', 'on_call', 'overtime'], default='regular'
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class LeaveRequestSerializer(serializers.Serializer):
    staff_id = serializers.UUIDField()
    leave_type = serializers.ChoiceField(choices=['annual', 'sick', 'emergency', 'unpaid'])
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError('end_date must be on or after start_date.')
        return data


class AttendanceSerializer(serializers.Serializer):
    staff_id = serializers.UUIDField()
    date = serializers.DateField()
    check_in = serializers.DateTimeField(required=False, allow_null=True)
    check_out = serializers.DateTimeField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=['present', 'absent', 'late', 'on_leave', 'holiday'], default='present'
    )
    notes = serializers.CharField(required=False, allow_blank=True)
