from django.urls import path
from . import views

urlpatterns = [
    # Patients
    path('patients/', views.patient_list_create, name='patient-list-create'),
    path('patients/<str:patient_id>/', views.patient_detail, name='patient-detail'),
    # Appointments
    path('appointments/', views.appointment_list_create, name='appointment-list-create'),
    path('appointments/<str:appointment_id>/', views.appointment_detail, name='appointment-detail'),
    # Visit Records
    path('visits/', views.visit_list_create, name='visit-list-create'),
    # WhatsApp Reminder
    path('appointments/<str:appointment_id>/send-reminder/', views.send_reminder, name='send-reminder'),
]
