# backend/app/api/deliveries.py
"""
Delivery management API endpoints.
Handles both outbound deliveries (to customers) and inbound deliveries (from suppliers).
"""

from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import text
from app.extensions import db
from app.api.decorators import require_permission
from app.models.sales import OutboundDelivery
from app.models.inventory import Supplier, Product, InventoryMovement
from app.models.enums import StockMovementType

deliveries_bp = Blueprint("deliveries", __name__)


# ============================================================
# OUTBOUND DELIVERIES (to customers)
# ============================================================


@deliveries_bp.get("/outbound")
@require_permission("delivery.outbound.view")
def list_outbound_deliveries():
    """
    List all outbound deliveries with optional status filter.
    Query params: status, page, per_page
    """
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 25, type=int)

    base_query = """
        SELECT
            od.delivery_id,
            od.transaction_id,
            od.driver_id,
            u.full_name AS driver_name,
            od.customer_id,
            c.name AS customer_name,
            od.scheduled_date,
            od.delivered_at,
            od.delivery_zone,
            od.latitude,
            od.longitude,
            od.eta_minutes,
            od.status,
            od.delivery_notes,
            od.signature_captured
        FROM outbound_deliveries od
        JOIN users u ON u.user_id = od.driver_id
        JOIN customers c ON c.customer_id = od.customer_id
    """
    params = {}

    if status:
        base_query += " WHERE od.status = :status"
        params["status"] = status

    # Count total for pagination
    count_query = f"SELECT COUNT(*) FROM ({base_query}) AS t"
    total = db.session.execute(text(count_query), params).scalar()

    # Add ordering and pagination
    base_query += " ORDER BY od.scheduled_date DESC LIMIT :limit OFFSET :offset"
    params["limit"] = per_page
    params["offset"] = (page - 1) * per_page

    result = db.session.execute(text(base_query), params)
    deliveries = [dict(row._mapping) for row in result]

    # Convert datetime objects to ISO strings
    for d in deliveries:
        if d.get("scheduled_date"):
            d["scheduled_date"] = d["scheduled_date"].isoformat()
        if d.get("delivered_at"):
            d["delivered_at"] = d["delivered_at"].isoformat()

    return jsonify(
        deliveries=deliveries,
        total=total,
        page=page,
        pages=(total + per_page - 1) // per_page,
    )


@deliveries_bp.post("/outbound")
@require_permission("delivery.outbound.create")
def create_outbound_delivery():
    """
    Create a new outbound delivery for a sale transaction.
    Required: transaction_id, driver_id, scheduled_date
    Optional: delivery_zone, delivery_notes

    Auto-calculates eta_minutes based on the delivery zone using
    the zone_eta configuration from system settings.
    Also populates GPS coordinates from the customer record if available.
    """
    from app.models.sales import SaleTransaction, Customer
    from app.api.system import get_zone_eta

    data = request.get_json() or {}
    identity = get_jwt_identity()

    # Validate required fields
    required = ["transaction_id", "driver_id", "scheduled_date"]
    for field in required:
        if field not in data:
            return jsonify(error=f"{field} is required"), 400

    # Verify transaction exists
    txn = db.session.get(SaleTransaction, data["transaction_id"])
    if not txn:
        return jsonify(error="Transaction not found"), 404

    # Verify customer exists
    customer = db.session.get(Customer, txn.customer_id)

    # Determine delivery zone — from request or customer record
    zone = data.get("delivery_zone") or (customer.zone if customer else None)

    # Auto-calculate ETA based on zone
    eta_minutes = get_zone_eta(zone) if zone else get_zone_eta(None)

    delivery = OutboundDelivery(
        transaction_id=data["transaction_id"],
        driver_id=data["driver_id"],
        customer_id=txn.customer_id,
        scheduled_date=datetime.fromisoformat(data["scheduled_date"]),
        delivery_zone=zone,
        # Populate GPS from customer if available (customer table would need these fields)
        # For now, leave as None — they can be set later via the location update endpoint
        latitude=None,
        longitude=None,
        eta_minutes=eta_minutes,
        delivery_notes=data.get("delivery_notes"),
    )
    db.session.add(delivery)
    db.session.commit()

    return jsonify(
        message="Outbound delivery created",
        delivery_id=delivery.delivery_id,
        eta_minutes=eta_minutes,
    ), 201


@deliveries_bp.patch("/outbound/<int:delivery_id>")
@require_permission("delivery.outbound.update")
def update_outbound_delivery(delivery_id):
    """
    Update an outbound delivery status.
    Used by drivers to mark deliveries as in_transit, delivered, failed, or rescheduled.
    """
    delivery = db.session.get(OutboundDelivery, delivery_id)
    if not delivery:
        return jsonify(error="Delivery not found"), 404

    data = request.get_json() or {}

    if "status" in data:
        delivery.status = data["status"]

    if data.get("status") == "delivered":
        delivery.delivered_at = datetime.utcnow()
        delivery.signature_captured = data.get("signature_captured", False)

    if "delivery_notes" in data:
        delivery.delivery_notes = data["delivery_notes"]

    if "scheduled_date" in data:
        delivery.scheduled_date = datetime.fromisoformat(data["scheduled_date"])

    db.session.commit()

    return jsonify(
        message="Delivery updated",
        status=delivery.status.value if delivery.status else None,
    )


# ============================================================
# INBOUND DELIVERIES (from suppliers)
# ============================================================


@deliveries_bp.get("/inbound")
@require_permission("delivery.inbound.view")
def list_inbound_deliveries():
    """
    List all inbound supplier deliveries.
    Query params: status, supplier_id, page, per_page
    """
    status = request.args.get("status")
    supplier_id = request.args.get("supplier_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 25, type=int)

    where_clauses = ["1=1"]
    params = {}

    if status:
        where_clauses.append("id.status = :status")
        params["status"] = status

    if supplier_id:
        where_clauses.append("id.supplier_id = :supplier_id")
        params["supplier_id"] = supplier_id

    where_clause = " AND ".join(where_clauses)

    base_query = f"""
        SELECT
            id.delivery_id,
            id.supplier_id,
            s.name AS supplier_name,
            id.received_by,
            u.full_name AS received_by_name,
            id.delivery_date,
            id.delivery_note_ref,
            id.status,
            id.notes,
            id.created_at,
            (SELECT COUNT(*) FROM inbound_delivery_items idi
             WHERE idi.delivery_id = id.delivery_id) AS item_count
        FROM inbound_deliveries id
        JOIN suppliers s ON s.supplier_id = id.supplier_id
        JOIN users u ON u.user_id = id.received_by
        WHERE {where_clause}
        ORDER BY id.delivery_date DESC
        LIMIT :limit OFFSET :offset
    """

    params["limit"] = per_page
    params["offset"] = (page - 1) * per_page

    result = db.session.execute(text(base_query), params)
    deliveries = [dict(row._mapping) for row in result]

    # Convert datetime objects to ISO strings
    for d in deliveries:
        if d.get("delivery_date"):
            d["delivery_date"] = d["delivery_date"].isoformat()
        if d.get("created_at"):
            d["created_at"] = d["created_at"].isoformat()

    # Get total count
    count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
    count_query = f"SELECT COUNT(*) FROM inbound_deliveries WHERE {where_clause}"
    total = db.session.execute(text(count_query), count_params).scalar()

    return jsonify(
        deliveries=deliveries,
        total=total,
        page=page,
        pages=(total + per_page - 1) // per_page,
    )


@deliveries_bp.post("/inbound")
@require_permission("delivery.inbound.receive")
def create_inbound_delivery():
    """
    Create a new inbound delivery record and receive stock.
    This creates the delivery header, items, and updates product stock levels.

    Required: supplier_id, items (array of {product_id, quantity_received, unit_cost})
    Optional: delivery_note_ref, notes
    """
    data = request.get_json() or {}
    identity = get_jwt_identity()

    if "supplier_id" not in data or "items" not in data:
        return jsonify(error="supplier_id and items are required"), 400

    if not data["items"]:
        return jsonify(error="At least one item is required"), 400

    # Create the inbound delivery header
    query = text("""
        INSERT INTO inbound_deliveries (supplier_id, received_by, delivery_note_ref, notes, status)
        VALUES (:supplier_id, :received_by, :delivery_note_ref, :notes, 'complete')
    """)
    result = db.session.execute(
        query,
        {
            "supplier_id": data["supplier_id"],
            "received_by": identity["user_id"],
            "delivery_note_ref": data.get("delivery_note_ref"),
            "notes": data.get("notes"),
        },
    )
    delivery_id = result.lastrowid

    # Process each item: insert into inbound_delivery_items and update stock
    for item in data["items"]:
        product_id = item["product_id"]
        qty = item["quantity_received"]
        cost = item.get("unit_cost", 0)

        # Insert delivery item
        db.session.execute(
            text("""
            INSERT INTO inbound_delivery_items (delivery_id, product_id, quantity_expected, quantity_received, unit_cost)
            VALUES (:delivery_id, :product_id, :qty_expected, :qty_received, :unit_cost)
        """),
            {
                "delivery_id": delivery_id,
                "product_id": product_id,
                "qty_expected": item.get("quantity_expected", qty),
                "qty_received": qty,
                "unit_cost": cost,
            },
        )

        # Update product stock
        db.session.execute(
            text("""
            UPDATE products SET current_stock = current_stock + :qty WHERE product_id = :product_id
        """),
            {"qty": qty, "product_id": product_id},
        )

        # Record inventory movement
        db.session.execute(
            text("""
            INSERT INTO inventory_movements
                (product_id, movement_type, reference_type, reference_id, quantity_change, stock_after, performed_by, notes)
            VALUES
                (:product_id, 'purchase', 'inbound_delivery', :delivery_id, :qty,
                 (SELECT current_stock FROM products WHERE product_id = :product_id),
                 :performed_by, :notes)
        """),
            {
                "product_id": product_id,
                "delivery_id": delivery_id,
                "qty": qty,
                "performed_by": identity["user_id"],
                "notes": f"Inbound delivery from supplier {data['supplier_id']}",
            },
        )

        # Check and create stock alert if needed
        product = db.session.get(Product, product_id)
        if product and product.is_low_stock():
            existing = db.session.execute(
                text("""
                SELECT alert_id FROM stock_alerts
                WHERE product_id = :pid AND is_resolved = FALSE
            """),
                {"pid": product_id},
            ).first()

            if not existing:
                alert_type = (
                    "out_of_stock" if product.current_stock <= 0 else "low_stock"
                )
                db.session.execute(
                    text("""
                    INSERT INTO stock_alerts (product_id, alert_type, current_stock, threshold)
                    VALUES (:pid, :alert_type, :stock, :threshold)
                """),
                    {
                        "pid": product_id,
                        "alert_type": alert_type,
                        "stock": product.current_stock,
                        "threshold": product.min_stock_level,
                    },
                )

    db.session.commit()

    return jsonify(
        message="Inbound delivery recorded and stock updated",
        delivery_id=delivery_id,
    ), 201


# ============================================================
# DRIVERS (for delivery assignment dropdowns)
# ============================================================


@deliveries_bp.get("/drivers")
@require_permission("delivery.outbound.view")
def list_drivers():
    """Return list of users with the driver role for delivery assignment."""
    result = db.session.execute(
        text("""
        SELECT u.user_id, u.full_name, u.phone, r.role_name
        FROM users u
        JOIN roles r ON r.role_id = u.role_id
        WHERE u.is_active = TRUE AND u.deleted_at IS NULL
          AND r.role_name = 'driver'
        ORDER BY u.full_name
    """)
    )
    drivers = [dict(row._mapping) for row in result]
    return jsonify(drivers=drivers)


# ============================================================
# DELIVERY LOCATION TRACKING (for driver GPS)
# ============================================================


@deliveries_bp.patch("/outbound/<int:delivery_id>/location")
@require_permission("delivery.outbound.update")
def update_delivery_location(delivery_id):
    """
    Update the GPS location of an outbound delivery.
    Called periodically by the driver's device to track progress.
    Expects: { "lat": -1.2921, "lng": 36.8219 }
    """
    delivery = db.session.get(OutboundDelivery, delivery_id)
    if not delivery:
        return jsonify(error="Delivery not found"), 404

    data = request.get_json() or {}
    if "lat" not in data or "lng" not in data:
        return jsonify(error="lat and lng are required"), 400

    # Store location as JSON in delivery_notes if not already present
    import json

    notes_data = {}
    if delivery.delivery_notes:
        try:
            notes_data = json.loads(delivery.delivery_notes)
        except (json.JSONDecodeError, TypeError):
            notes_data = {"notes": delivery.delivery_notes}

    notes_data["last_lat"] = data["lat"]
    notes_data["last_lng"] = data["lng"]
    notes_data["last_location_update"] = datetime.utcnow().isoformat()

    # Preserve existing notes
    if "notes" not in notes_data and delivery.delivery_notes:
        try:
            json.loads(delivery.delivery_notes)
        except (json.JSONDecodeError, TypeError):
            notes_data["notes"] = delivery.delivery_notes

    delivery.delivery_notes = json.dumps(notes_data)
    db.session.commit()

    return jsonify(message="Location updated")


@deliveries_bp.get("/outbound/<int:delivery_id>")
@require_permission("delivery.outbound.view")
def get_outbound_delivery_detail(delivery_id):
    """
    Get full details of an outbound delivery including items and customer location.
    Used for the delivery detail/map view.
    """
    result = db.session.execute(
        text("""
            SELECT
                od.delivery_id,
                od.transaction_id,
                od.driver_id,
                u.full_name AS driver_name,
                u.phone AS driver_phone,
                od.customer_id,
                c.name AS customer_name,
                c.phone AS customer_phone,
                c.address AS customer_address,
                c.zone AS delivery_zone,
                od.scheduled_date,
                od.delivered_at,
                od.status,
                od.delivery_notes,
                od.signature_captured,
                od.latitude,
                od.longitude,
                od.eta_minutes,
                st.total_amount,
                st.payment_status,
                st.payment_method
            FROM outbound_deliveries od
            JOIN users u ON u.user_id = od.driver_id
            JOIN customers c ON c.customer_id = od.customer_id
            JOIN sale_transactions st ON st.transaction_id = od.transaction_id
            WHERE od.delivery_id = :did
        """),
        {"did": delivery_id},
    ).first()

    if not result:
        return jsonify(error="Delivery not found"), 404

    delivery = dict(result._mapping)

    # Parse location data from delivery_notes
    import json

    location_data = {}
    if delivery.get("delivery_notes"):
        try:
            notes_parsed = json.loads(delivery["delivery_notes"])
            if isinstance(notes_parsed, dict):
                location_data = {
                    "last_lat": notes_parsed.get("last_lat"),
                    "last_lng": notes_parsed.get("last_lng"),
                    "last_location_update": notes_parsed.get("last_location_update"),
                }
                # Remove location data from notes for display
                display_notes = notes_parsed.get("notes", "")
                delivery["delivery_notes"] = display_notes
        except (json.JSONDecodeError, TypeError):
            pass

    # Get sale items for this delivery
    items = db.session.execute(
        text("""
            SELECT p.name, p.sku, si.quantity, si.unit_price, si.discount,
                   (si.quantity * si.unit_price - si.discount) AS subtotal
            FROM sale_items si
            JOIN products p ON p.product_id = si.product_id
            WHERE si.transaction_id = :tid
        """),
        {"tid": delivery["transaction_id"]},
    ).fetchall()

    delivery["items"] = [
        {
            "name": i.name,
            "sku": i.sku,
            "quantity": i.quantity,
            "unit_price": float(i.unit_price),
            "discount": float(i.discount),
            "subtotal": float(i.subtotal),
        }
        for i in items
    ]

    delivery["location"] = location_data

    # Convert datetimes
    for key in ("scheduled_date", "delivered_at"):
        if delivery.get(key) and hasattr(delivery[key], "isoformat"):
            delivery[key] = delivery[key].isoformat()

    return jsonify(delivery=delivery)


@deliveries_bp.get("/outbound/<int:delivery_id>/manifest")
@require_permission("delivery.outbound.view")
def get_delivery_manifest(delivery_id):
    """
    Return just the goods manifest (sale items) for a delivery.
    Lightweight endpoint used by the delivery detail modal.
    """
    delivery = db.session.get(OutboundDelivery, delivery_id)
    if not delivery:
        return jsonify(error="Delivery not found"), 404

    items = db.session.execute(
        text("""
            SELECT p.name AS product_name, p.sku, si.quantity, si.unit_price, si.discount,
                   (si.quantity * si.unit_price - si.discount) AS subtotal
            FROM sale_items si
            JOIN products p ON p.product_id = si.product_id
            WHERE si.transaction_id = :tid
        """),
        {"tid": delivery.transaction_id},
    ).fetchall()

    manifest = [
        {
            "product_name": i.product_name,
            "sku": i.sku,
            "quantity": i.quantity,
            "unit_price": float(i.unit_price),
            "discount": float(i.discount),
            "subtotal": float(i.subtotal),
        }
        for i in items
    ]

    return jsonify(manifest=manifest, delivery_id=delivery_id)


# ============================================================
# INBOUND DELIVERY DETAIL (for countdown/summary page)
# ============================================================


@deliveries_bp.get("/inbound/<int:delivery_id>")
@require_permission("delivery.inbound.view")
def get_inbound_delivery_detail(delivery_id):
    """
    Get full details of an inbound delivery including items, supplier info,
    and expected vs received quantities.
    Used for the inbound delivery receiving page with countdown.
    """
    result = db.session.execute(
        text("""
            SELECT
                id.delivery_id,
                id.supplier_id,
                s.name AS supplier_name,
                s.address AS supplier_address,
                id.received_by,
                u.full_name AS received_by_name,
                id.delivery_date,
                id.delivery_note_ref,
                id.status,
                id.notes,
                id.created_at,
                po.expected_delivery AS po_expected_date,
                po.order_date AS po_order_date
            FROM inbound_deliveries id
            JOIN suppliers s ON s.supplier_id = id.supplier_id
            LEFT JOIN users u ON u.user_id = id.received_by
            LEFT JOIN purchase_orders po ON po.supplier_id = id.supplier_id
                AND po.status IN ('approved', 'received')
            WHERE id.delivery_id = :did
            ORDER BY po.order_date DESC
            LIMIT 1
        """),
        {"did": delivery_id},
    ).first()

    if not result:
        return jsonify(error="Inbound delivery not found"), 404

    delivery = dict(result._mapping)

    # Get delivery items with product details and expected quantities from PO
    items = db.session.execute(
        text("""
            SELECT
                idi.delivery_item_id,
                idi.product_id,
                p.name AS product_name,
                p.sku,
                p.current_stock AS current_stock,
                idi.quantity_expected,
                idi.quantity_received,
                idi.unit_cost,
                (idi.quantity_received * idi.unit_cost) AS line_total
            FROM inbound_delivery_items idi
            JOIN products p ON p.product_id = idi.product_id
            WHERE idi.delivery_id = :did
        """),
        {"did": delivery_id},
    ).fetchall()

    delivery["items"] = [
        {
            "delivery_item_id": i.delivery_item_id,
            "product_id": i.product_id,
            "product_name": i.product_name,
            "sku": i.sku,
            "current_stock": i.current_stock,
            "quantity_expected": i.quantity_expected,
            "quantity_received": i.quantity_received,
            "unit_cost": float(i.unit_cost),
            "line_total": float(i.line_total),
        }
        for i in items
    ]

    # Calculate totals
    delivery["total_items"] = len(items)
    delivery["total_value"] = sum(float(i.line_total) for i in items)
    delivery["total_received"] = sum(i.quantity_received for i in items)
    delivery["total_expected"] = sum(i.quantity_expected for i in items)

    # Convert datetimes
    for key in ("delivery_date", "created_at", "po_expected_date", "po_order_date"):
        if delivery.get(key) and hasattr(delivery[key], "isoformat"):
            delivery[key] = delivery[key].isoformat()

    return jsonify(delivery=delivery)
