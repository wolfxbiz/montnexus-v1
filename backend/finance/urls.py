from django.urls import path
from . import views

urlpatterns = [
    # Invoices
    path('invoices/', views.invoice_list_create, name='invoice-list-create'),
    path('invoices/<str:invoice_id>/', views.invoice_detail, name='invoice-detail'),
    path('invoices/<str:invoice_id>/items/', views.invoice_item_create, name='invoice-item-create'),
    path('invoices/<str:invoice_id>/items/<str:item_id>/', views.invoice_item_delete, name='invoice-item-delete'),
    # Payments
    path('payments/', views.payment_list_create, name='payment-list-create'),
    # Expenses
    path('expenses/', views.expense_list_create, name='expense-list-create'),
    path('expenses/<str:expense_id>/', views.expense_detail, name='expense-detail'),
    # Razorpay
    path('invoices/<str:invoice_id>/create-order/', views.create_razorpay_order, name='create-razorpay-order'),
    path('payments/verify/', views.verify_razorpay_payment, name='verify-razorpay-payment'),
    path('invoices/<str:invoice_id>/record-offline/', views.record_offline_payment, name='record-offline-payment'),
    # Reports
    path('summary/', views.finance_summary, name='finance-summary'),
    path('revenue/', views.revenue_by_month, name='revenue-by-month'),
]
