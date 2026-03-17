from datetime import datetime, date
from decimal import Decimal
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client

from .serializers import InvoiceSerializer, InvoiceItemSerializer, PaymentSerializer, ExpenseSerializer
from .signals import log_action


def _sb():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _actor(request):
    return request.supabase_user.get('sub', '')


def _calc_total(subtotal, tax_percent, discount):
    sub = Decimal(str(subtotal or 0))
    tax = sub * Decimal(str(tax_percent or 0)) / 100
    disc = Decimal(str(discount or 0))
    return float(sub + tax - disc)


# ─────────────────────────────────────────
# INVOICES
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def invoice_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('invoices').select(
            '*, patient:patients(id, full_name, phone)'
        ).eq('is_deleted', False)

        if pstatus := request.GET.get('status'):
            query = query.eq('payment_status', pstatus)
        if patient_id := request.GET.get('patient_id'):
            query = query.eq('patient_id', patient_id)
        if date_from := request.GET.get('date_from'):
            query = query.gte('issue_date', date_from)
        if date_to := request.GET.get('date_to'):
            query = query.lte('issue_date', date_to)

        result = query.order('created_at', desc=True).execute()
        return Response(result.data)

    ser = InvoiceSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = ser.validated_data

    # Auto-generate invoice number via Supabase SQL function
    inv_num_result = sb.rpc('generate_invoice_number', {}).execute()
    invoice_number = inv_num_result.data if isinstance(inv_num_result.data, str) else f"INV-{datetime.utcnow().strftime('%Y-%m%d%H%M%S')}"

    total = _calc_total(validated.get('subtotal', 0), validated.get('tax_percent', 0), validated.get('discount_amount', 0))

    data = {
        'invoice_number': invoice_number,
        'patient_id': str(validated['patient_id']),
        'appointment_id': str(validated['appointment_id']) if validated.get('appointment_id') else None,
        'issued_by': _actor(request),
        'issue_date': str(validated['issue_date']) if validated.get('issue_date') else str(date.today()),
        'due_date': str(validated['due_date']) if validated.get('due_date') else None,
        'subtotal': float(validated.get('subtotal', 0)),
        'tax_percent': float(validated.get('tax_percent', 0)),
        'discount_amount': float(validated.get('discount_amount', 0)),
        'total_amount': total,
        'payment_status': validated.get('payment_status', 'pending'),
        'payment_method': validated.get('payment_method'),
        'notes': validated.get('notes', ''),
        'is_deleted': False,
    }

    result = sb.table('invoices').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'INVOICE_CREATED', 'invoices', result.data[0]['id'], {
            'invoice_number': invoice_number,
            'patient_id': data['patient_id'],
            'total': total,
        })
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH', 'DELETE'])
def invoice_detail(request, invoice_id):
    sb = _sb()

    if request.method == 'GET':
        invoice = sb.table('invoices').select(
            '*, patient:patients(id, full_name, phone)'
        ).eq('id', invoice_id).eq('is_deleted', False).single().execute()

        if not invoice.data:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

        items = sb.table('invoice_items').select('*').eq('invoice_id', invoice_id).execute()
        payments = sb.table('payments').select('*').eq('invoice_id', invoice_id)\
            .order('payment_date', desc=True).execute()

        total_paid = sum(float(p.get('amount_paid', 0)) for p in (payments.data or []))
        total_due = float(invoice.data.get('total_amount') or 0) - total_paid

        return Response({
            **invoice.data,
            'items': items.data,
            'payments': payments.data,
            'total_paid': total_paid,
            'total_due': max(0, total_due),
        })

    if request.method == 'PATCH':
        allowed = {'payment_status', 'payment_method', 'notes', 'due_date',
                   'subtotal', 'tax_percent', 'discount_amount'}
        data = {k: v for k, v in request.data.items() if k in allowed}

        if any(k in data for k in ('subtotal', 'tax_percent', 'discount_amount')):
            existing = sb.table('invoices').select('subtotal, tax_percent, discount_amount')\
                .eq('id', invoice_id).single().execute().data or {}
            sub = data.get('subtotal', existing.get('subtotal', 0))
            tax = data.get('tax_percent', existing.get('tax_percent', 0))
            disc = data.get('discount_amount', existing.get('discount_amount', 0))
            data['total_amount'] = _calc_total(sub, tax, disc)

        data['updated_at'] = datetime.utcnow().isoformat()
        result = sb.table('invoices').update(data).eq('id', invoice_id).execute()
        if result.data:
            log_action(_actor(request), 'INVOICE_UPDATED', 'invoices', invoice_id, data)
            return Response(result.data[0])
        return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # DELETE — soft
    sb.table('invoices').update({'is_deleted': True}).eq('id', invoice_id).execute()
    log_action(_actor(request), 'INVOICE_DELETED', 'invoices', invoice_id)
    return Response({'message': 'Invoice deleted'})


# ─────────────────────────────────────────
# INVOICE ITEMS
# ─────────────────────────────────────────

@api_view(['POST'])
def invoice_item_create(request, invoice_id):
    sb = _sb()
    ser = InvoiceItemSerializer(data={**request.data, 'invoice_id': invoice_id})
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = ser.validated_data
    data = {
        'invoice_id': str(validated['invoice_id']),
        'description': validated['description'],
        'quantity': validated['quantity'],
        'unit_price': float(validated['unit_price']),
    }
    result = sb.table('invoice_items').insert(data).execute()
    if result.data:
        # Recalculate subtotal on invoice
        all_items = sb.table('invoice_items').select('quantity, unit_price')\
            .eq('invoice_id', invoice_id).execute()
        new_subtotal = sum(float(i['quantity']) * float(i['unit_price']) for i in (all_items.data or []))
        inv = sb.table('invoices').select('tax_percent, discount_amount')\
            .eq('id', invoice_id).single().execute().data or {}
        new_total = _calc_total(new_subtotal, inv.get('tax_percent', 0), inv.get('discount_amount', 0))
        sb.table('invoices').update({
            'subtotal': new_subtotal,
            'total_amount': new_total,
        }).eq('id', invoice_id).execute()
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def invoice_item_delete(request, invoice_id, item_id):
    sb = _sb()
    sb.table('invoice_items').delete().eq('id', item_id).eq('invoice_id', invoice_id).execute()

    # Recalculate subtotal
    all_items = sb.table('invoice_items').select('quantity, unit_price')\
        .eq('invoice_id', invoice_id).execute()
    new_subtotal = sum(float(i['quantity']) * float(i['unit_price']) for i in (all_items.data or []))
    inv = sb.table('invoices').select('tax_percent, discount_amount')\
        .eq('id', invoice_id).single().execute().data or {}
    new_total = _calc_total(new_subtotal, inv.get('tax_percent', 0), inv.get('discount_amount', 0))
    sb.table('invoices').update({
        'subtotal': new_subtotal,
        'total_amount': new_total,
    }).eq('id', invoice_id).execute()

    return Response({'message': 'Item removed'})


# ─────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def payment_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('payments').select('*')
        if invoice_id := request.GET.get('invoice_id'):
            query = query.eq('invoice_id', invoice_id)
        result = query.order('payment_date', desc=True).execute()
        return Response(result.data)

    ser = PaymentSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = ser.validated_data
    invoice_id = str(validated['invoice_id'])

    data = {
        'invoice_id': invoice_id,
        'amount_paid': float(validated['amount_paid']),
        'payment_date': validated['payment_date'].isoformat() if validated.get('payment_date') else datetime.utcnow().isoformat(),
        'payment_method': validated.get('payment_method', ''),
        'reference_number': validated.get('reference_number', ''),
        'notes': validated.get('notes', ''),
        'recorded_by': _actor(request),
    }

    result = sb.table('payments').insert(data).execute()
    if result.data:
        # Recalculate payment status on invoice
        all_payments = sb.table('payments').select('amount_paid').eq('invoice_id', invoice_id).execute()
        total_paid = sum(float(p['amount_paid']) for p in (all_payments.data or []))
        invoice = sb.table('invoices').select('total_amount').eq('id', invoice_id).single().execute().data or {}
        total_amount = float(invoice.get('total_amount') or 0)

        if total_amount > 0:
            new_status = 'paid' if total_paid >= total_amount else 'partial'
            sb.table('invoices').update({'payment_status': new_status}).eq('id', invoice_id).execute()

        log_action(_actor(request), 'PAYMENT_RECORDED', 'payments', result.data[0]['id'], {
            'invoice_id': invoice_id,
            'amount': data['amount_paid'],
        })
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────
# EXPENSES
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def expense_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('expenses').select('*').eq('is_deleted', False)
        if category := request.GET.get('category'):
            query = query.eq('category', category)
        if date_from := request.GET.get('date_from'):
            query = query.gte('expense_date', date_from)
        if date_to := request.GET.get('date_to'):
            query = query.lte('expense_date', date_to)
        result = query.order('expense_date', desc=True).execute()
        return Response(result.data)

    ser = ExpenseSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = ser.validated_data
    data = {
        **validated,
        'amount': float(validated['amount']),
        'expense_date': str(validated['expense_date']) if validated.get('expense_date') else str(date.today()),
        'recorded_by': _actor(request),
        'is_deleted': False,
    }

    result = sb.table('expenses').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'EXPENSE_LOGGED', 'expenses', result.data[0]['id'], {
            'category': data['category'],
            'amount': data['amount'],
        })
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH', 'DELETE'])
def expense_detail(request, expense_id):
    sb = _sb()

    if request.method == 'PATCH':
        allowed = {'category', 'description', 'amount', 'expense_date', 'paid_to'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        if 'amount' in data:
            data['amount'] = float(data['amount'])
        result = sb.table('expenses').update(data).eq('id', expense_id).execute()
        if result.data:
            log_action(_actor(request), 'EXPENSE_UPDATED', 'expenses', expense_id, data)
            return Response(result.data[0])
        return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    sb.table('expenses').update({'is_deleted': True}).eq('id', expense_id).execute()
    log_action(_actor(request), 'EXPENSE_DELETED', 'expenses', expense_id)
    return Response({'message': 'Expense deleted'})


# ─────────────────────────────────────────
# REVENUE SUMMARY
# ─────────────────────────────────────────

@api_view(['GET'])
def finance_summary(request):
    sb = _sb()
    today_str = str(date.today())
    month_start = today_str[:8] + '01'

    # Today's invoices
    today_invoices = sb.table('invoices').select('total_amount, payment_status')\
        .eq('issue_date', today_str).eq('is_deleted', False).execute().data or []
    today_invoiced = sum(float(i.get('total_amount') or 0) for i in today_invoices)

    # Today's payments
    today_payments = sb.table('payments').select('amount_paid')\
        .gte('payment_date', today_str).lte('payment_date', today_str + 'T23:59:59').execute().data or []
    today_collected = sum(float(p.get('amount_paid') or 0) for p in today_payments)

    # This month invoices
    month_invoices = sb.table('invoices').select('total_amount, payment_status')\
        .gte('issue_date', month_start).lte('issue_date', today_str).eq('is_deleted', False).execute().data or []
    month_invoiced = sum(float(i.get('total_amount') or 0) for i in month_invoices)

    # This month payments
    month_payments = sb.table('payments').select('amount_paid')\
        .gte('payment_date', month_start).lte('payment_date', today_str + 'T23:59:59').execute().data or []
    month_collected = sum(float(p.get('amount_paid') or 0) for p in month_payments)

    # This month expenses
    month_expenses = sb.table('expenses').select('amount')\
        .gte('expense_date', month_start).lte('expense_date', today_str).eq('is_deleted', False).execute().data or []
    expense_total = sum(float(e.get('amount') or 0) for e in month_expenses)

    # Pending invoices total
    pending_invoices = sb.table('invoices').select('total_amount')\
        .in_('payment_status', ['pending', 'partial', 'overdue'])\
        .eq('is_deleted', False).execute().data or []
    total_pending = sum(float(i.get('total_amount') or 0) for i in pending_invoices)

    return Response({
        'today': {
            'invoiced': today_invoiced,
            'collected': today_collected,
            'pending': today_invoiced - today_collected,
        },
        'this_month': {
            'invoiced': month_invoiced,
            'collected': month_collected,
            'pending': month_invoiced - month_collected,
            'expenses': expense_total,
            'net': month_collected - expense_total,
        },
        'outstanding': total_pending,
    })


@api_view(['GET'])
def revenue_by_month(request):
    """Returns last 6 months of invoiced vs collected vs expenses."""
    sb = _sb()
    results = []
    today = date.today()

    for i in range(5, -1, -1):
        # Go back i months
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        month_start = f"{year}-{month:02d}-01"
        # Last day of month
        last_day = (date(year, month % 12 + 1, 1) if month < 12 else date(year + 1, 1, 1))
        month_end = str(last_day - __import__('datetime').timedelta(days=1))
        label = f"{year}-{month:02d}"

        invoices = sb.table('invoices').select('total_amount')\
            .gte('issue_date', month_start).lte('issue_date', month_end)\
            .eq('is_deleted', False).execute().data or []
        invoiced = sum(float(inv.get('total_amount') or 0) for inv in invoices)

        payments = sb.table('payments').select('amount_paid')\
            .gte('payment_date', month_start).lte('payment_date', month_end + 'T23:59:59').execute().data or []
        collected = sum(float(p.get('amount_paid') or 0) for p in payments)

        expenses = sb.table('expenses').select('amount')\
            .gte('expense_date', month_start).lte('expense_date', month_end)\
            .eq('is_deleted', False).execute().data or []
        expense_total = sum(float(e.get('amount') or 0) for e in expenses)

        results.append({
            'month': label,
            'invoiced': invoiced,
            'collected': collected,
            'expenses': expense_total,
        })

    return Response(results)
