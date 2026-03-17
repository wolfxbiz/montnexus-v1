from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_users, name='list-users'),
    path('invite/', views.invite_user, name='invite-user'),
]
