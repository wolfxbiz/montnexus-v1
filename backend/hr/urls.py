from django.urls import path
from . import views

urlpatterns = [
    # Staff
    path('staff/', views.staff_list_create, name='staff-list-create'),
    path('staff/<str:staff_id>/', views.staff_detail, name='staff-detail'),
    # Shifts
    path('shifts/', views.shift_list_create, name='shift-list-create'),
    path('shifts/<str:shift_id>/', views.shift_detail, name='shift-detail'),
    # Leave
    path('leave/', views.leave_list_create, name='leave-list-create'),
    path('leave/<str:leave_id>/approve/', views.leave_approve, name='leave-approve'),
    path('leave/<str:leave_id>/reject/', views.leave_reject, name='leave-reject'),
    path('leave-balance/<str:staff_id>/', views.leave_balance, name='leave-balance'),
    # Attendance
    path('attendance/', views.attendance_list_create, name='attendance-list-create'),
    path('attendance/<str:attendance_id>/', views.attendance_detail, name='attendance-detail'),
]
