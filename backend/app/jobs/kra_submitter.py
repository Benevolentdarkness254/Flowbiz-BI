# backend/app/jobs/kra_submitter.py
from datetime import datetime
from app.extensions import db
from app.models.sales import Invoice
from app.models.enums import KRAStatus


def submit_pending_invoices(app):
    """
    Retry KRA eTIMS submissions for invoices in not_submitted or rejected state.
    For the POC, this simulates the submission. In production, replace
    _submit_to_kra() with the real KRA API call using the requests library.
    """
    with app.app_context():
        pending = Invoice.query.filter(
            Invoice.kra_status.in_([KRAStatus.NOT_SUBMITTED, KRAStatus.REJECTED])
        ).limit(50).all()  # process max 50 per run to avoid long-running jobs

        if not pending:
            return

        app.logger.info(f'Processing {len(pending)} KRA submissions...')

        for invoice in pending:
            try:
                reference = _submit_to_kra(invoice)
                invoice.kra_status       = KRAStatus.ACCEPTED
                invoice.kra_reference    = reference
                invoice.kra_submitted_at = datetime.utcnow()
                invoice.kra_accepted_at  = datetime.utcnow()
                invoice.kra_error_log    = None
            except Exception as e:
                invoice.kra_status    = KRAStatus.REJECTED
                invoice.kra_error_log = str(e)
                app.logger.error(f'KRA submission failed for invoice {invoice.invoice_id}: {e}')

        db.session.commit()


def _submit_to_kra(invoice: Invoice) -> str:
    """
    POC stub — returns a fake reference number.
    Replace with:
        import requests
        response = requests.post(
            'https://etims-api.kra.go.ke/etims-api/...',
            json=invoice_payload,
            headers={'Authorization': f'Bearer {kra_token}'},
            timeout=30
        )
        response.raise_for_status()
        return response.json()['invoiceNumber']
    """
    import uuid
    return f'KRA-{uuid.uuid4().hex[:12].upper()}'