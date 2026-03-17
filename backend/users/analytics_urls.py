from django.urls import path
from . import analytics_views

urlpatterns = [
    path('summary/', analytics_views.summary, name='analytics-summary'),
    path('activity/', analytics_views.activity, name='analytics-activity'),
]
