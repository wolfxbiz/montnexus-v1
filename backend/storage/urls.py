from django.urls import path
from . import views

urlpatterns = [
    path('files/', views.files, name='files'),
    path('files/<str:file_id>/', views.delete_file, name='delete-file'),
]
