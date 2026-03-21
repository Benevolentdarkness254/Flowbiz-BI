import enum

class PaymentMethod(enum.Enum):
    CASH          = 'cash'
    MPESA         = 'mpesa'
    BANK_TRANSFER = 'bank_transfer'
    CREDIT        = 'credit'
    CHEQUE        = 'cheque'

class PaymentStatus(enum.Enum):
    PENDING   = 'pending'
    PAID      = 'paid'
    PARTIAL   = 'partial'
    REFUNDED  = 'refunded'
    CANCELLED = 'cancelled'

class CustomerType(enum.Enum):
    WALK_IN   = 'walk_in'
    ACCOUNT   = 'account'
    WHOLESALE = 'wholesale'

class SupplierType(enum.Enum):
    RAW_WATER   = 'raw_water'
    PACKAGING   = 'packaging'
    EQUIPMENT   = 'equipment'
    MAINTENANCE = 'maintenance'
    OTHER       = 'other'

class ProductCategory(enum.Enum):
    PACKAGED_WATER     = 'packaged_water'
    REFILL_SERVICE     = 'refill_service'
    CONTAINER          = 'container'
    PACKAGING_MATERIAL = 'packaging_material'
    EQUIPMENT          = 'equipment'
    OTHER              = 'other'

class StockMovementType(enum.Enum):
    SALE       = 'sale'
    PURCHASE   = 'purchase'
    ADJUSTMENT = 'adjustment'
    RETURN     = 'return'
    WRITE_OFF  = 'write_off'
    TRANSFER   = 'transfer'
    OPENING    = 'opening'

class POStatus(enum.Enum):
    DRAFT            = 'draft'
    PENDING_APPROVAL = 'pending_approval'
    APPROVED         = 'approved'
    DECLINED         = 'declined'
    RECEIVED         = 'received'
    PARTIAL          = 'partial'
    CANCELLED        = 'cancelled'

class ReceiptType(enum.Enum):
    PAYMENT = 'payment'
    DEPOSIT = 'deposit'
    REFUND  = 'refund'


class KRAStatus(enum.Enum):
    NOT_REQUIRED  = 'not_required'
    NOT_SUBMITTED = 'not_submitted'
    PENDING       = 'pending'
    SUBMITTED     = 'submitted'
    ACCEPTED      = 'accepted'
    REJECTED      = 'rejected'


class DeliveryStatus(enum.Enum):
    SCHEDULED   = 'scheduled'
    IN_TRANSIT  = 'in_transit'
    DELIVERED   = 'delivered'
    FAILED      = 'failed'
    RESCHEDULED = 'rescheduled'


class DispatchChannel(enum.Enum):
    THERMAL_PRINTER = 'thermal_printer'
    PDF_EMAIL       = 'pdf_email'
    SMS             = 'sms'
    WHATSAPP        = 'whatsapp'
    DIGITAL_ONLY    = 'digital_only'
