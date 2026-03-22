import uuid
import requests
from datetime import datetime
from app.extensions import db
from app.models.sales import Invoice
from app.models.enums import KRAStatus


def submit_invoice(invoice: Invoice) -> dict:
    """
    Submit an invoice to KRA eTIMS API.
    
    POC: returns a fake reference number.
    Production: replace _call_kra_api() with the real implementation
    using your KRA credentials and the actual eTIMS endpoint.
    """
    try:
        reference = _call_kra_api(invoice)
        invoice.kra_status       = KRAStatus.ACCEPTED
        invoice.kra_reference    = reference
        invoice.kra_submitted_at = datetime.utcnow()
        invoice.kra_accepted_at  = datetime.utcnow()
        invoice.kra_error_log    = None
        db.session.commit()
        return {'status': 'accepted', 'reference': reference}

    except Exception as e:
        invoice.kra_status    = KRAStatus.REJECTED
        invoice.kra_error_log = str(e)
        db.session.commit()
        return {'status': 'rejected', 'error': str(e)}


def _call_kra_api(invoice: Invoice) -> str:
    """
    POC stub — returns a fake KRA reference number.

    incase you are looking forward remember to change this fuctions code to :
    payload = {
        'invoiceNumber': invoice.invoice_number,
        'totalAmount':   float(invoice.total_amount),
        'taxAmount':     float(invoice.tax_amount),
        'invoiceDate':   invoice.invoice_date.isoformat(),
        'customerPin':   invoice.transaction.customer.kra_pin,
    }
    response = requests.post(
        'https://etims-api.kra.go.ke/etims-api/submitInvoice',
        json=payload,
        headers={
            'Authorization': f'Bearer {os.environ["KRA_API_TOKEN"]}',
            'Content-Type':  'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()['invoiceNumber']
    """
    return f'KRA-{uuid.uuid4().hex[:12].upper()}'


def get_pending_invoices():
    """Return all invoices that need KRA submission."""
    return Invoice.query.filter(
        Invoice.kra_status.in_([KRAStatus.NOT_SUBMITTED, KRAStatus.REJECTED])
    ).all()