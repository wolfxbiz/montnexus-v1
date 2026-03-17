from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/users/', include('users.urls')),
    path('api/storage/', include('storage.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/analytics/', include('users.analytics_urls')),
]
