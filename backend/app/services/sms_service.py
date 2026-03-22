# backend/app/services/sms_service.py
import os
import requests
from app.extensions import db
from app.models.receipts import ReceiptPrintLog
from app.models.enums import DispatchChannel


def send_receipt_sms(receipt, phone_number: str, dispatched_by_id: int) -> dict:
    """
    Send a receipt confirmation via SMS.

    POC: logs the message without actually sending.
    Production: replace _call_sms_gateway() with Africa's Talking
    or Twilio using your credentials from environment variables.
    """
    message = _build_message(receipt)

    try:
        message_id = _call_sms_gateway(phone_number, message)
        status = 'sent'
    except Exception as e:
        message_id = None
        status = 'failed'

    # log the dispatch attempt regardless of success or failure
    log = ReceiptPrintLog(
        receipt_id       = receipt.receipt_id,
        dispatch_channel = DispatchChannel.SMS,
        dispatched_to    = phone_number,
        dispatched_by    = dispatched_by_id,
        status           = status,
        failure_reason   = None if status == 'sent' else str(e),
    )
    db.session.add(log)
    db.session.commit()

    return {'status': status, 'message_id': message_id, 'to': phone_number}


def send_receipt_whatsapp(receipt, phone_number: str, dispatched_by_id: int) -> dict:
    """
    Send a receipt confirmation via WhatsApp Business API.
    Same pattern as SMS — stub for POC, replace with real API for production.
    """
    message = _build_message(receipt)

    try:
        message_id = _call_whatsapp_gateway(phone_number, message)
        status = 'sent'
    except Exception as e:
        message_id = None
        status = 'failed'

    log = ReceiptPrintLog(
        receipt_id       = receipt.receipt_id,
        dispatch_channel = DispatchChannel.WHATSAPP,
        dispatched_to    = phone_number,
        dispatched_by    = dispatched_by_id,
        status           = status,
        failure_reason   = None if status == 'sent' else str(e),
    )
    db.session.add(log)
    db.session.commit()

    return {'status': status, 'message_id': message_id, 'to': phone_number}


def _build_message(receipt) -> str:
    """Build the SMS text for a receipt."""
    return (
        f"Flowbiz Receipt {receipt.receipt_number}\n"
        f"Amount: KES {float(receipt.amount_paid):,.2f}\n"
        f"Method: {receipt.payment_method.value.upper()}\n"
        f"Date: {receipt.receipt_date.strftime('%d/%m/%Y %H:%M')}\n"
        f"Thank you for your business."
    )


def _call_sms_gateway(phone_number: str, message: str) -> str:
    """
    POC stub — prints to console instead of sending.

    Production with Africa's Talking:
    import africastalking
    africastalking.initialize(
        os.environ['AT_USERNAME'],
        os.environ['AT_API_KEY']
    )
    sms = africastalking.SMS
    response = sms.send(message, [phone_number])
    return response['SMSMessageData']['Recipients'][0]['messageId']

    Production with Twilio:
    from twilio.rest import Client
    client = Client(os.environ['TWILIO_SID'], os.environ['TWILIO_TOKEN'])
    msg = client.messages.create(
        body=message,
        from_=os.environ['TWILIO_PHONE'],
        to=phone_number
    )
    return msg.sid
    """
    print(f'[SMS POC] To: {phone_number} | Message: {message}')
    return f'POC-SMS-{phone_number[-4:]}'


def _call_whatsapp_gateway(phone_number: str, message: str) -> str:
    """
    POC stub — prints to console instead of sending.

    Production: use Meta WhatsApp Business API or Twilio WhatsApp.
    """
    print(f'[WhatsApp POC] To: {phone_number} | Message: {message}')
    return f'POC-WA-{phone_number[-4:]}'