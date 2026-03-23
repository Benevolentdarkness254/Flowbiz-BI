# backend/tests/unit/test_receipt_service.py
import pytest
from app.services.receipt_service import issue_payment_receipt, void_receipt
from app.models.receipts import Receipt
from app.models.enums import ReceiptType, PaymentMethod, PaymentStatus
from app.extensions import db
from tests.factories import (
    CustomerFactory, ProductFactory,
    UserFactory, RoleFactory
)


def _make_transaction(app):
    """
    Helper that creates a minimal SaleTransaction for receipt tests.
    Defined here rather than in factories.py because it needs the full
    sale flow including items — too complex for a simple factory.
    """
    from app.services.sales_service import create_sale
    from app.models.enums import PaymentMethod as PM

    role     = RoleFactory()
    staff    = UserFactory(role=role)
    customer = CustomerFactory()
    product  = ProductFactory(current_stock=50, price=100.00)
    db.session.flush()

    data = {
        'customer_id':    customer.customer_id,
        'payment_method': 'cash',
        'items': [{
            'product_id': product.product_id,
            'quantity':   1,
            'unit_price': 100.00,
        }]
    }
    # create_sale internally calls issue_payment_receipt — we call it
    # here just to get a transaction object to test against directly
    from app.models.sales import SaleTransaction
    from app.models.enums import PaymentStatus as PS

    txn = SaleTransaction(
        customer_id    = customer.customer_id,
        sales_staff_id = staff.user_id,
        subtotal       = 100.00,
        discount_amount= 0,
        tax_amount     = 16.00,
        total_amount   = 116.00,
        payment_method = PM.CASH,
        payment_status = PS.PAID,
    )
    db.session.add(txn)
    db.session.flush()
    return txn, staff


def test_issue_payment_receipt_creates_receipt(app):
    """
    Verifies that issue_payment_receipt() creates a Receipt row
    with the correct type, amount, and payment method.
    """
    with app.app_context():
        txn, staff = _make_transaction(app)

        receipt = issue_payment_receipt(txn, staff.user_id)

        # receipt must exist in the database
        assert receipt.receipt_id is not None
        # must be a payment receipt, not deposit or refund
        assert receipt.receipt_type == ReceiptType.PAYMENT
        # amount must match the transaction total
        assert float(receipt.amount_paid) == float(txn.total_amount)
        # payment method must be copied from the transaction
        assert receipt.payment_method == txn.payment_method
        # receipt number must follow the RCP-YYYYMMDD-XXXX format
        assert receipt.receipt_number.startswith('RCP-')


def test_issue_payment_receipt_number_is_unique(app):
    """
    Verifies that two receipts issued in the same session get
    different receipt numbers. This proves the sequence procedure works.
    """
    with app.app_context():
        txn1, staff = _make_transaction(app)
        txn2, _     = _make_transaction(app)

        receipt1 = issue_payment_receipt(txn1, staff.user_id)
        receipt2 = issue_payment_receipt(txn2, staff.user_id)

        assert receipt1.receipt_number != receipt2.receipt_number


def test_void_receipt_sets_voided_at(app):
    """
    Verifies that void_receipt() sets voided_at to a timestamp
    and records the reason. The receipt must still exist in the
    database — voiding never deletes records.
    """
    with app.app_context():
        txn, staff = _make_transaction(app)
        receipt    = issue_payment_receipt(txn, staff.user_id)

        voided = void_receipt(receipt.receipt_id, staff.user_id, 'Test void reason')

        # voided_at must be set to a timestamp
        assert voided.voided_at is not None
        # void reason must be recorded
        assert voided.void_reason == 'Test void reason'
        # voided_by must record who did it
        assert voided.voided_by == staff.user_id
        # the receipt must still exist — never hard deleted
        still_exists = db.session.get(Receipt, receipt.receipt_id)
        assert still_exists is not None


def test_void_receipt_already_voided_raises_error(app):
    """
    Verifies that trying to void an already-voided receipt raises
    a ValueError. Double-voiding would corrupt the financial ledger.
    """
    with app.app_context():
        txn, staff = _make_transaction(app)
        receipt    = issue_payment_receipt(txn, staff.user_id)

        # void it once — this should work
        void_receipt(receipt.receipt_id, staff.user_id, 'First void')

        # void it again — this should raise
        with pytest.raises(ValueError, match='already voided'):
            void_receipt(receipt.receipt_id, staff.user_id, 'Second void')


def test_void_receipt_nonexistent_raises_error(app):
    """
    Verifies that trying to void a receipt that does not exist
    raises a ValueError with a useful message.
    """
    with app.app_context():
        with pytest.raises(ValueError, match='not found'):
            void_receipt(99999, 1, 'Void non-existent')