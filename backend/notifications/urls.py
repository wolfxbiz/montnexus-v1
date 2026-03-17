from django.urls import path
from . import views

urlpatterns = [
    path('notify/leave/', views.notify_leave, name='notify-leave'),
    path('webhook/whatsapp/', views.whatsapp_webhook, name='whatsapp-webhook'),
]
