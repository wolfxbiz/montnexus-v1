from django.urls import path
from . import views

urlpatterns = [
    # Items
    path('items/', views.item_list_create, name='item-list-create'),
    path('items/<str:item_id>/', views.item_detail, name='item-detail'),
    # Transactions
    path('transactions/', views.transaction_list_create, name='transaction-list-create'),
    # Alerts
    path('alerts/', views.low_stock_alerts, name='low-stock-alerts'),
    path('expiring/', views.expiring_items, name='expiring-items'),
    # Assets
    path('assets/', views.asset_list_create, name='asset-list-create'),
    path('assets/<str:asset_id>/', views.asset_detail, name='asset-detail'),
]
