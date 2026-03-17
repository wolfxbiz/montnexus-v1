from rest_framework import serializers


class InventoryItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    category = serializers.CharField()
    sku = serializers.CharField(required=False, allow_blank=True)
    unit = serializers.CharField(default='units')
    current_stock = serializers.IntegerField(default=0)
    minimum_stock = serializers.IntegerField(default=10)
    unit_cost = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    supplier_name = serializers.CharField(required=False, allow_blank=True)
    supplier_contact = serializers.CharField(required=False, allow_blank=True)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    storage_location = serializers.CharField(required=False, allow_blank=True)


class StockTransactionSerializer(serializers.Serializer):
    item_id = serializers.UUIDField()
    transaction_type = serializers.ChoiceField(
        choices=['restock', 'consume', 'adjustment', 'dispose']
    )
    quantity = serializers.IntegerField()  # positive=restock, negative=consume
    reference = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class AssetSerializer(serializers.Serializer):
    name = serializers.CharField()
    category = serializers.CharField(required=False, allow_blank=True)
    asset_tag = serializers.CharField(required=False, allow_blank=True)
    serial_number = serializers.CharField(required=False, allow_blank=True)
    purchase_date = serializers.DateField(required=False, allow_null=True)
    purchase_cost = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    assigned_to = serializers.UUIDField(required=False, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=['active', 'under_maintenance', 'retired', 'lost'], default='active'
    )
    warranty_expiry = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
