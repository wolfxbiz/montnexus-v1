from datetime import datetime, date, timedelta
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client

from .serializers import InventoryItemSerializer, StockTransactionSerializer, AssetSerializer
from .signals import log_action


def _sb():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _actor(request):
    return request.supabase_user.get('sub', '')


# ─────────────────────────────────────────
# INVENTORY ITEMS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def item_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('inventory_items').select('*').eq('is_deleted', False)

        if category := request.GET.get('category'):
            query = query.eq('category', category)
        if request.GET.get('low_stock') == 'true':
            # Fetch all then filter in Python (Supabase doesn't support col-vs-col filters directly)
            result = query.order('name').execute()
            low = [i for i in (result.data or []) if i['current_stock'] <= i['minimum_stock']]
            return Response(low)

        result = query.order('name').execute()
        return Response(result.data)

    ser = InventoryItemSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = {**ser.validated_data, 'is_deleted': False}
    if data.get('expiry_date'):
        data['expiry_date'] = str(data['expiry_date'])
    if data.get('unit_cost') is not None:
        data['unit_cost'] = float(data['unit_cost'])

    result = sb.table('inventory_items').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'ITEM_CREATED', 'inventory_items',
                   result.data[0]['id'], {'name': data['name']})
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH', 'DELETE'])
def item_detail(request, item_id):
    sb = _sb()

    if request.method == 'GET':
        item = sb.table('inventory_items').select('*').eq('id', item_id)\
            .eq('is_deleted', False).single().execute()
        if not item.data:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

        transactions = sb.table('stock_transactions').select('*')\
            .eq('item_id', item_id).order('created_at', desc=True).limit(20).execute()

        return Response({**item.data, 'transactions': transactions.data})

    if request.method == 'PATCH':
        allowed = {'name', 'category', 'sku', 'unit', 'minimum_stock', 'unit_cost',
                   'supplier_name', 'supplier_contact', 'expiry_date', 'storage_location'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        if data.get('unit_cost') is not None:
            data['unit_cost'] = float(data['unit_cost'])
        data['updated_at'] = datetime.utcnow().isoformat()

        result = sb.table('inventory_items').update(data).eq('id', item_id).execute()
        if result.data:
            log_action(_actor(request), 'ITEM_UPDATED', 'inventory_items', item_id, data)
            return Response(result.data[0])
        return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    sb.table('inventory_items').update({'is_deleted': True}).eq('id', item_id).execute()
    log_action(_actor(request), 'ITEM_DELETED', 'inventory_items', item_id)
    return Response({'message': 'Item deleted'})


# ─────────────────────────────────────────
# STOCK TRANSACTIONS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def transaction_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('stock_transactions').select(
            '*, item:inventory_items(id, name, unit)'
        )
        if item_id := request.GET.get('item_id'):
            query = query.eq('item_id', item_id)
        result = query.order('created_at', desc=True).limit(50).execute()
        return Response(result.data)

    ser = StockTransactionSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = ser.validated_data
    item_id = str(validated['item_id'])

    # Fetch current stock before transaction
    item = sb.table('inventory_items').select('current_stock, name, minimum_stock')\
        .eq('id', item_id).single().execute()
    if not item.data:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    prev_stock = item.data['current_stock']
    qty = validated['quantity']

    # Enforce correct sign based on transaction type
    if validated['transaction_type'] in ('consume', 'dispose') and qty > 0:
        qty = -qty  # consume/dispose must reduce stock
    elif validated['transaction_type'] == 'restock' and qty < 0:
        qty = abs(qty)

    new_stock = prev_stock + qty
    if new_stock < 0:
        return Response(
            {'error': f'Insufficient stock. Current: {prev_stock}, requested: {abs(qty)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    data = {
        'item_id': item_id,
        'transaction_type': validated['transaction_type'],
        'quantity': qty,
        'previous_stock': prev_stock,
        'new_stock': new_stock,
        'reference': validated.get('reference', ''),
        'notes': validated.get('notes', ''),
        'performed_by': _actor(request),
    }

    # Insert transaction — DB trigger auto-updates current_stock
    result = sb.table('stock_transactions').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'STOCK_UPDATED', 'stock_transactions',
                   result.data[0]['id'], {
                       'item_id': item_id,
                       'item_name': item.data['name'],
                       'type': validated['transaction_type'],
                       'qty': qty,
                       'new_stock': new_stock,
                   })

        response = {**result.data[0], 'new_stock': new_stock}
        if new_stock <= item.data['minimum_stock']:
            response['_alert'] = (
                f"Stock for '{item.data['name']}' is below minimum "
                f"({new_stock} ≤ {item.data['minimum_stock']})."
            )
        return Response(response, status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────

@api_view(['GET'])
def low_stock_alerts(request):
    sb = _sb()
    result = sb.table('inventory_items').select('*').eq('is_deleted', False)\
        .order('current_stock').execute()
    alerts = [i for i in (result.data or []) if i['current_stock'] <= i['minimum_stock']]
    return Response(alerts)


@api_view(['GET'])
def expiring_items(request):
    sb = _sb()
    today_str = str(date.today())
    in_30_days = str(date.today() + timedelta(days=30))

    result = sb.table('inventory_items').select('*').eq('is_deleted', False)\
        .gte('expiry_date', today_str).lte('expiry_date', in_30_days)\
        .order('expiry_date').execute()
    return Response(result.data)


# ─────────────────────────────────────────
# ASSETS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def asset_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('assets').select(
            '*, assigned_to_profile:profiles(id, full_name)'
        ).eq('is_deleted', False)

        if ast_status := request.GET.get('status'):
            query = query.eq('status', ast_status)

        result = query.order('name').execute()
        return Response(result.data)

    ser = AssetSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = {**ser.validated_data, 'is_deleted': False}
    for field in ('purchase_date', 'warranty_expiry'):
        if data.get(field):
            data[field] = str(data[field])
    if data.get('purchase_cost') is not None:
        data['purchase_cost'] = float(data['purchase_cost'])
    if data.get('assigned_to'):
        data['assigned_to'] = str(data['assigned_to'])

    result = sb.table('assets').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'ASSET_CREATED', 'assets',
                   result.data[0]['id'], {'name': data['name']})
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH', 'DELETE'])
def asset_detail(request, asset_id):
    sb = _sb()

    if request.method == 'PATCH':
        allowed = {'status', 'assigned_to', 'location', 'notes', 'warranty_expiry'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        result = sb.table('assets').update(data).eq('id', asset_id).execute()
        if result.data:
            log_action(_actor(request), 'ASSET_UPDATED', 'assets', asset_id, data)
            return Response(result.data[0])
        return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    sb.table('assets').update({'is_deleted': True}).eq('id', asset_id).execute()
    log_action(_actor(request), 'ASSET_DELETED', 'assets', asset_id)
    return Response({'message': 'Asset deleted'})
