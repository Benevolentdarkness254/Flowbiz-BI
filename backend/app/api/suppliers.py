# backend/app/api/suppliers.py
"""
Supplier Management API with full CRUD and approval workflow.

- Inventory staff can create/edit suppliers (starts as pending)
- Business owners can approve/reject/suspend suppliers
- All users with po.view can browse supplier details and performance
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from app.api.decorators import require_permission
from app.models.inventory import Supplier, SupplierContact
from app.models.enums import SupplierApprovalStatus
from app.extensions import db
from sqlalchemy import text

suppliers_bp = Blueprint("suppliers", __name__)


def _serialize_supplier(s):
    """Convert a Supplier model to a dict for API responses."""
    primary_contact = next((c for c in s.contacts if c.is_primary), None)
    return {
        "supplier_id": s.supplier_id,
        "name": s.name,
        "supplier_type": s.supplier_type.value
        if hasattr(s.supplier_type, "value")
        else s.supplier_type,
        "kra_pin": s.kra_pin,
        "payment_terms": s.payment_terms,
        "is_active": s.is_active,
        "address": s.address,
        "contract_start": s.contract_start.isoformat() if s.contract_start else None,
        "contract_end": s.contract_end.isoformat() if s.contract_end else None,
        "goods_dealt_with": s.goods_dealt_with,
        "notes": s.notes,
        "approval_status": s.approval_status.value
        if hasattr(s.approval_status, "value")
        else s.approval_status,
        "approved_by": s.approved_by,
        "approved_at": s.approved_at.isoformat() if s.approved_at else None,
        "rejection_reason": s.rejection_reason,
        "primary_contact": {
            "name": primary_contact.contact_name if primary_contact else None,
            "phone": primary_contact.phone if primary_contact else None,
            "email": primary_contact.email if primary_contact else None,
        }
        if primary_contact
        else None,
        "contacts": [
            {
                "contact_id": c.contact_id,
                "contact_name": c.contact_name,
                "role": c.role,
                "phone": c.phone,
                "email": c.email,
                "is_primary": c.is_primary,
            }
            for c in s.contacts
        ],
        "created_at": s.created_at.isoformat(),
    }


# ============================================================
# LIST / GET SUPPLIERS
# ============================================================


@suppliers_bp.get("/")
@require_permission("po.view")
def list_suppliers():
    """
    List all suppliers with optional filters.
    Query params: approval_status, is_active, page, per_page
    """
    approval_status = request.args.get("approval_status")
    is_active = request.args.get("is_active")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 25, type=int)

    query = Supplier.query.filter_by(deleted_at=None)

    if approval_status:
        query = query.filter_by(approval_status=approval_status)
    if is_active is not None:
        query = query.filter_by(is_active=is_active.lower() == "true")

    query = query.order_by(Supplier.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        suppliers=[_serialize_supplier(s) for s in pagination.items],
        total=pagination.total,
        page=pagination.page,
        pages=pagination.pages,
    )


@suppliers_bp.get("/<int:supplier_id>")
@require_permission("po.view")
def get_supplier(supplier_id):
    """Get full details of a single supplier including all contacts."""
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404
    return jsonify(supplier=_serialize_supplier(supplier))


# ============================================================
# CREATE / UPDATE SUPPLIER
# ============================================================


@suppliers_bp.post("/")
@require_permission("po.create")
def create_supplier():
    """
    Create a new supplier application.
    New suppliers start with approval_status='pending' until approved by owner.
    Accepts: name, supplier_type, kra_pin, payment_terms, address,
             contract_start, contract_end, goods_dealt_with, notes,
             contacts (array of {contact_name, role, phone, email, is_primary})
    """
    data = request.get_json() or {}

    required = ["name", "supplier_type"]
    for field in required:
        if field not in data:
            return jsonify(error=f"{field} is required"), 400

    supplier = Supplier(
        name=data["name"],
        supplier_type=data["supplier_type"],
        kra_pin=data.get("kra_pin"),
        payment_terms=data.get("payment_terms", 30),
        address=data.get("address"),
        contract_start=data.get("contract_start"),
        contract_end=data.get("contract_end"),
        goods_dealt_with=data.get("goods_dealt_with"),
        notes=data.get("notes"),
        approval_status=SupplierApprovalStatus.PENDING,
    )
    db.session.add(supplier)
    db.session.flush()

    # Create contacts if provided
    for c_data in data.get("contacts", []):
        contact = SupplierContact(
            supplier_id=supplier.supplier_id,
            contact_name=c_data.get("contact_name", ""),
            role=c_data.get("role"),
            phone=c_data.get("phone"),
            email=c_data.get("email"),
            is_primary=c_data.get("is_primary", False),
        )
        db.session.add(contact)

    db.session.commit()

    return jsonify(
        message="Supplier application created and submitted for approval",
        supplier_id=supplier.supplier_id,
    ), 201


@suppliers_bp.put("/<int:supplier_id>")
@require_permission("po.create")
def update_supplier(supplier_id):
    """
    Update a supplier's details.
    If an approved supplier is modified, it reverts to pending for re-approval.
    """
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404

    data = request.get_json() or {}

    if "name" in data:
        supplier.name = data["name"]
    if "supplier_type" in data:
        supplier.supplier_type = data["supplier_type"]
    if "kra_pin" in data:
        supplier.kra_pin = data["kra_pin"]
    if "payment_terms" in data:
        supplier.payment_terms = data["payment_terms"]
    if "address" in data:
        supplier.address = data["address"]
    if "contract_start" in data:
        supplier.contract_start = data["contract_start"]
    if "contract_end" in data:
        supplier.contract_end = data["contract_end"]
    if "goods_dealt_with" in data:
        supplier.goods_dealt_with = data["goods_dealt_with"]
    if "notes" in data:
        supplier.notes = data["notes"]
    if "is_active" in data:
        supplier.is_active = bool(data["is_active"])

    # If an approved supplier is modified, require re-approval
    if supplier.approval_status == SupplierApprovalStatus.APPROVED and any(
        k in data
        for k in [
            "name",
            "supplier_type",
            "kra_pin",
            "payment_terms",
            "contract_start",
            "contract_end",
            "goods_dealt_with",
        ]
    ):
        supplier.approval_status = SupplierApprovalStatus.PENDING
        supplier.approved_by = None
        supplier.approved_at = None
        supplier.rejection_reason = None

    # Update contacts if provided
    if "contacts" in data:
        for c in supplier.contacts:
            db.session.delete(c)
        for c_data in data["contacts"]:
            contact = SupplierContact(
                supplier_id=supplier.supplier_id,
                contact_name=c_data.get("contact_name", ""),
                role=c_data.get("role"),
                phone=c_data.get("phone"),
                email=c_data.get("email"),
                is_primary=c_data.get("is_primary", False),
            )
            db.session.add(contact)

    db.session.commit()
    return jsonify(message="Supplier updated")


@suppliers_bp.delete("/<int:supplier_id>")
@require_permission("po.create")
def delete_supplier(supplier_id):
    """Soft-delete a supplier."""
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404

    supplier.deleted_at = datetime.utcnow()
    supplier.is_active = False
    db.session.commit()
    return jsonify(message="Supplier deleted")


# ============================================================
# APPROVAL WORKFLOW (owner only)
# ============================================================


@suppliers_bp.post("/<int:supplier_id>/approve")
@require_permission("po.approve")
def approve_supplier(supplier_id):
    """Approve a pending supplier application."""
    user_id = int(get_jwt_identity())
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404
    if supplier.approval_status != SupplierApprovalStatus.PENDING:
        return jsonify(error="Only pending suppliers can be approved"), 422

    supplier.approval_status = SupplierApprovalStatus.APPROVED
    supplier.approved_by = user_id
    supplier.approved_at = datetime.utcnow()
    supplier.rejection_reason = None
    db.session.commit()

    return jsonify(message="Supplier approved")


@suppliers_bp.post("/<int:supplier_id>/reject")
@require_permission("po.approve")
def reject_supplier(supplier_id):
    """Reject a pending supplier application with a reason."""
    data = request.get_json() or {}
    user_id = int(get_jwt_identity())
    reason = data.get("reason")
    if not reason:
        return jsonify(error="A reason is required when rejecting"), 400

    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404

    supplier.approval_status = SupplierApprovalStatus.REJECTED
    supplier.approved_by = user_id
    supplier.approved_at = datetime.utcnow()
    supplier.rejection_reason = reason
    db.session.commit()

    return jsonify(message="Supplier rejected")


@suppliers_bp.post("/<int:supplier_id>/suspend")
@require_permission("po.approve")
def suspend_supplier(supplier_id):
    """Suspend an approved supplier."""
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404
    if supplier.approval_status != SupplierApprovalStatus.APPROVED:
        return jsonify(error="Only approved suppliers can be suspended"), 422

    supplier.approval_status = SupplierApprovalStatus.SUSPENDED
    supplier.is_active = False
    db.session.commit()

    return jsonify(message="Supplier suspended")


@suppliers_bp.post("/<int:supplier_id>/reinstate")
@require_permission("po.approve")
def reinstate_supplier(supplier_id):
    """Reinstate a suspended supplier back to approved."""
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404
    if supplier.approval_status != SupplierApprovalStatus.SUSPENDED:
        return jsonify(error="Only suspended suppliers can be reinstated"), 422

    supplier.approval_status = SupplierApprovalStatus.APPROVED
    supplier.is_active = True
    db.session.commit()

    return jsonify(message="Supplier reinstated")


# ============================================================
# SUPPLIER PERFORMANCE ANALYTICS
# ============================================================


@suppliers_bp.get("/<int:supplier_id>/performance")
@require_permission("po.view")
def supplier_performance(supplier_id):
    """
    Return performance metrics for a supplier:
    - Total POs, total value, received/approved/declined counts
    - Average lead time
    - Recent POs with this supplier
    - Products supplied and their pricing
    - Monthly spend trend (last 6 months)
    """
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier or supplier.deleted_at:
        return jsonify(error="Supplier not found"), 404

    # PO stats
    po_stats = db.session.execute(
        text("""
        SELECT
            COUNT(*) AS total_orders,
            COALESCE(SUM(total_amount), 0) AS total_value,
            SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) AS received,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) AS declined,
            AVG(CASE WHEN status = 'received' AND approved_at IS NOT NULL AND order_date IS NOT NULL
                THEN DATEDIFF(expected_delivery, order_date) END) AS avg_lead_time
        FROM purchase_orders
        WHERE supplier_id = :sid AND deleted_at IS NULL
    """),
        {"sid": supplier_id},
    ).first()

    # Recent POs
    recent_pos = db.session.execute(
        text("""
        SELECT purchase_order_id, order_date, total_amount, status, rejection_reason
        FROM purchase_orders
        WHERE supplier_id = :sid AND deleted_at IS NULL
        ORDER BY order_date DESC
        LIMIT 10
    """),
        {"sid": supplier_id},
    ).fetchall()

    # Products supplied
    products = db.session.execute(
        text("""
        SELECT p.name, p.category, ps.unit_cost, ps.lead_time_days, ps.is_primary
        FROM product_suppliers ps
        JOIN products p ON p.product_id = ps.product_id
        WHERE ps.supplier_id = :sid AND p.deleted_at IS NULL
    """),
        {"sid": supplier_id},
    ).fetchall()

    # Monthly spend (last 6 months)
    monthly_spend = db.session.execute(
        text("""
        SELECT DATE_FORMAT(order_date, '%%Y-%%m') AS month,
               COUNT(*) AS orders,
               COALESCE(SUM(total_amount), 0) AS total
        FROM purchase_orders
        WHERE supplier_id = :sid
          AND order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          AND deleted_at IS NULL
        GROUP BY DATE_FORMAT(order_date, '%%Y-%%m')
        ORDER BY month DESC
    """),
        {"sid": supplier_id},
    ).fetchall()

    # Contract period
    contract_days = None
    if supplier.contract_start and supplier.contract_end:
        contract_days = (supplier.contract_end - supplier.contract_start).days

    # Reliability score
    total_completed = po_stats.received or 0
    total_orders = po_stats.total_orders or 1
    reliability = (
        round((total_completed / total_orders) * 100, 1) if total_orders > 0 else 0
    )

    return jsonify(
        supplier={
            "name": supplier.name,
            "supplier_type": supplier.supplier_type.value
            if hasattr(supplier.supplier_type, "value")
            else supplier.supplier_type,
            "approval_status": supplier.approval_status.value
            if hasattr(supplier.approval_status, "value")
            else supplier.approval_status,
            "contract_start": supplier.contract_start.isoformat()
            if supplier.contract_start
            else None,
            "contract_end": supplier.contract_end.isoformat()
            if supplier.contract_end
            else None,
            "contract_days": contract_days,
            "goods_dealt_with": supplier.goods_dealt_with,
        },
        performance={
            "total_orders": po_stats.total_orders,
            "total_value": float(po_stats.total_value),
            "received": po_stats.received,
            "approved": po_stats.approved,
            "pending": po_stats.pending,
            "declined": po_stats.declined,
            "reliability_score": reliability,
            "avg_lead_time_days": round(float(po_stats.avg_lead_time or 0), 1),
        },
        recent_orders=[dict(row._mapping) for row in recent_pos],
        products_supplied=[dict(row._mapping) for row in products],
        monthly_spend=[dict(row._mapping) for row in monthly_spend],
    )
