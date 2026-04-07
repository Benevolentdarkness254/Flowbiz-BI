// frontend/src/pages/Sales.jsx
// Sales transactions page with New Sale modal and optional delivery scheduling
import { useState } from 'react'
import { Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col, InputGroup, Accordion, Card } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { salesApi } from '../api/sales'
import StatusBadge from '../components/common/StatusBadge'

/**
 * Sales page — lists recent sale transactions and provides a "New Sale" modal.
 * The modal lets a cashier select a customer, add line items (product + qty + price),
 * choose a payment method, and optionally schedule an outbound delivery.
 */
export default function Sales() {
  const { can } = usePermission()

  // Fetch transactions and customer/product reference data
  const { data, loading, error, refetch } = useApi(
    () => salesApi.getTransactions({ page: 1, per_page: 50 }), []
  )
  const { data: customersData } = useApi(() => salesApi.getCustomers(), [])
  const { data: productsData } = useApi(() => salesApi.getProducts(), [])
  // Fetch drivers for delivery assignment (only if user has delivery.create permission)
  const { data: driversData } = useApi(() => salesApi.getDrivers(), [])

  // New sale modal state
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Sale form state
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [mpesaRef, setMpesaRef] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState([])

  // Delivery scheduling state
  const [scheduleDelivery, setScheduleDelivery] = useState(false)
  const [deliveryDriverId, setDeliveryDriverId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryZone, setDeliveryZone] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [minDeliveryTime, setMinDeliveryTime] = useState('')
  const [estimatedEta, setEstimatedEta] = useState(null)

  // Zone to ETA mapping (matches backend settings)
  const ZONE_ETA = {
    'Zone A': 30,
    'Zone B': 45,
    'Zone C': 60,
    'Zone D': 90,
    default: 45,
  }

  // Calculate minimum delivery time based on zone ETA
  const calculateMinDeliveryTime = (zone) => {
    const etaMinutes = ZONE_ETA[zone] || ZONE_ETA.default
    const now = new Date()
    const minTime = new Date(now.getTime() + etaMinutes * 60000)
    
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const year = minTime.getFullYear()
    const month = String(minTime.getMonth() + 1).padStart(2, '0')
    const day = String(minTime.getDate()).padStart(2, '0')
    const hours = String(minTime.getHours()).padStart(2, '0')
    const minutes = String(minTime.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Open the New Sale modal and reset form state
  const openNewSale = () => {
    setCustomerId('')
    setPaymentMethod('cash')
    setMpesaRef('')
    setNotes('')
    setLineItems([{ product_id: '', quantity: 1, unit_price: '', discount: 0 }])
    setScheduleDelivery(false)
    setDeliveryDriverId('')
    setDeliveryDate('')
    setDeliveryZone('')
    setDeliveryNotes('')
    setSubmitError(null)
    setSuccessMessage(null)
    setShowModal(true)
  }

  // Add a new empty line item row
  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: '', quantity: 1, unit_price: '', discount: 0 }])
  }

  // Remove a line item row (must have at least one)
  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  // Update a specific field on a line item
  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems]
    updated[index][field] = value

    // Auto-fill unit price when a product is selected
    if (field === 'product_id' && productsData?.products) {
      const product = productsData.products.find(p => p.product_id === parseInt(value))
      if (product) {
        updated[index].unit_price = product.price
      }
    }

    setLineItems(updated)
  }

  // Calculate the running total for the sale
  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseInt(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      const discount = parseFloat(item.discount) || 0
      return sum + (qty * price - discount)
    }, 0)
  }

  // Auto-fill delivery zone and ETA when customer is selected
  const handleCustomerSelect = (value) => {
    setCustomerId(value)
    if (value && customersData?.customers) {
      const customer = customersData.customers.find(c => c.customer_id === parseInt(value))
      if (customer?.zone) {
        setDeliveryZone(customer.zone)
        // Auto-calculate minimum delivery time based on zone ETA
        const minTime = calculateMinDeliveryTime(customer.zone)
        setMinDeliveryTime(minTime)
        setEstimatedEta(ZONE_ETA[customer.zone] || ZONE_ETA.default)
        
        // If current delivery date is before the new minimum, update it
        if (deliveryDate && deliveryDate < minTime) {
          setDeliveryDate(minTime)
        }
      }
    }
  }

  // Update minimum delivery time when zone changes manually
  const handleZoneChange = (value) => {
    setDeliveryZone(value)
    const minTime = calculateMinDeliveryTime(value)
    setMinDeliveryTime(minTime)
    setEstimatedEta(ZONE_ETA[value] || ZONE_ETA.default)
    
    // If current delivery date is before the new minimum, update it
    if (deliveryDate && deliveryDate < minTime) {
      setDeliveryDate(minTime)
    }
  }

  // Submit the sale to the backend
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)

    // Validate inputs
    if (!customerId) {
      setSubmitError('Please select a customer')
      setSubmitting(false)
      return
    }

    const items = lineItems.map(item => ({
      product_id: parseInt(item.product_id),
      quantity: parseInt(item.quantity),
      unit_price: parseFloat(item.unit_price),
      discount: parseFloat(item.discount) || 0,
    }))

    if (items.some(i => !i.product_id || i.quantity < 1 || !i.unit_price)) {
      setSubmitError('Please fill in all product, quantity, and price fields')
      setSubmitting(false)
      return
    }

    if (paymentMethod === 'mpesa' && !mpesaRef) {
      setSubmitError('M-Pesa reference is required for M-Pesa payments')
      setSubmitting(false)
      return
    }

    // Validate delivery fields if delivery is scheduled
    if (scheduleDelivery) {
      if (!deliveryDriverId) {
        setSubmitError('Please select a driver for the delivery')
        setSubmitting(false)
        return
      }
      if (!deliveryDate) {
        setSubmitError('Please select a delivery date and time')
        setSubmitting(false)
        return
      }
      // Ensure delivery time is not before the minimum (now + ETA)
      if (minDeliveryTime && deliveryDate < minDeliveryTime) {
        const etaText = estimatedEta ? `${estimatedEta} minutes` : 'the estimated time'
        setSubmitError(`Delivery must be at least ${etaText} from now`)
        setSubmitting(false)
        return
      }
    }

    try {
      const payload = {
        customer_id: parseInt(customerId),
        payment_method: paymentMethod,
        mpesa_ref: paymentMethod === 'mpesa' ? mpesaRef : null,
        notes: notes || null,
        items,
      }

      // Add delivery fields if scheduling delivery
      if (scheduleDelivery) {
        payload.delivery_driver_id = parseInt(deliveryDriverId)
        payload.delivery_date = deliveryDate
        payload.delivery_zone = deliveryZone || null
        payload.delivery_notes = deliveryNotes || null
      }

      const res = await salesApi.createTransaction(payload)
      setSuccessMessage(
        res.data.delivery_id
          ? `Sale completed! Delivery #${res.data.delivery_id} scheduled.`
          : 'Sale completed successfully!'
      )
      // Close modal after brief delay to show success message
      setTimeout(() => {
        setShowModal(false)
        refetch()
      }, 1500)
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.response?.data?.errors || 'Failed to create sale')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Sales Transactions</h5>
        {can('sale.create') && (
          <Button variant="primary" size="sm" onClick={openNewSale}>
            New Sale
          </Button>
        )}
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
            <th>Method</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.transactions?.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center text-muted">
                No sales recorded yet. Click "New Sale" to record your first transaction.
              </td>
            </tr>
          )}
          {data?.transactions?.map(txn => (
            <tr key={txn.transaction_id}>
              <td>{txn.transaction_id}</td>
              <td>{txn.customer_name}</td>
              <td>{new Date(txn.transaction_date).toLocaleDateString()}</td>
              <td>KES {parseFloat(txn.total_amount).toLocaleString()}</td>
              <td><Badge bg="secondary">{txn.payment_method}</Badge></td>
              <td><StatusBadge status={txn.payment_status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* New Sale Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>New Sale</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="sale-form" onSubmit={handleSubmit}>
            {submitError && <Alert variant="danger">{submitError}</Alert>}
            {successMessage && <Alert variant="success">{successMessage}</Alert>}

            {/* Customer and payment method row */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Customer *</Form.Label>
                  <Form.Select
                    required
                    value={customerId}
                    onChange={e => handleCustomerSelect(e.target.value)}
                  >
                    <option value="">Select customer</option>
                    {customersData?.customers?.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.name} ({c.customer_type?.replace('_', ' ')})
                        {c.zone ? ` — ${c.zone}` : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Payment Method *</Form.Label>
                  <Form.Select
                    required
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit">Credit</option>
                    <option value="cheque">Cheque</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* M-Pesa reference (conditionally shown) */}
            {paymentMethod === 'mpesa' && (
              <Form.Group className="mb-3">
                <Form.Label>M-Pesa Reference *</Form.Label>
                <Form.Control
                  required
                  value={mpesaRef}
                  onChange={e => setMpesaRef(e.target.value)}
                  placeholder="e.g. QJK7H8N9X2"
                />
              </Form.Group>
            )}

            {/* Line items table */}
            <Form.Label>Items</Form.Label>
            <Table size="sm" bordered>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: 80 }}>Qty</th>
                  <th style={{ width: 120 }}>Unit Price</th>
                  <th style={{ width: 100 }}>Discount</th>
                  <th style={{ width: 100 }}>Subtotal</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => {
                  const qty = parseInt(item.quantity) || 0
                  const price = parseFloat(item.unit_price) || 0
                  const discount = parseFloat(item.discount) || 0
                  const subtotal = qty * price - discount

                  return (
                    <tr key={index}>
                      <td>
                        <Form.Select
                          required
                          value={item.product_id}
                          onChange={e => updateLineItem(index, 'product_id', e.target.value)}
                        >
                          <option value="">Select product</option>
                          {productsData?.products?.map(p => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} ({p.sku}) — Stock: {p.current_stock}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateLineItem(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={e => updateLineItem(index, 'unit_price', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount}
                          onChange={e => updateLineItem(index, 'discount', e.target.value)}
                        />
                      </td>
                      <td className="text-end fw-bold">
                        KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        {lineItems.length > 1 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                          >
                            ×
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="text-end fw-bold">Total:</td>
                  <td className="text-end fw-bold fs-5">
                    KES {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </Table>

            <Button variant="outline-secondary" size="sm" onClick={addLineItem}>
              + Add Item
            </Button>

            {/* Delivery Scheduling Section */}
            {can('delivery.outbound.create') && (
              <Accordion className="mt-3">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>
                    <Form.Check
                      type="checkbox"
                      label="Schedule Delivery"
                      checked={scheduleDelivery}
                      onChange={e => setScheduleDelivery(e.target.checked)}
                      onClick={e => e.stopPropagation()}
                      className="me-2"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    {scheduleDelivery && (
                      <>
                        {/* ETA Info Banner */}
                        {estimatedEta && (
                          <Alert variant="info" className="py-2 mb-3">
                            <small>
                              <strong>Estimated delivery time:</strong> {estimatedEta} minutes
                              {deliveryZone && ` for ${deliveryZone}`}
                              {minDeliveryTime && (
                                <span className="ms-2">
                                  — Earliest: {new Date(minDeliveryTime).toLocaleString()}
                                </span>
                              )}
                            </small>
                          </Alert>
                        )}

                        <Row className="mb-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Driver *</Form.Label>
                              <Form.Select
                                required={scheduleDelivery}
                                value={deliveryDriverId}
                                onChange={e => setDeliveryDriverId(e.target.value)}
                              >
                                <option value="">Select driver</option>
                                {driversData?.drivers?.map(d => (
                                  <option key={d.user_id} value={d.user_id}>
                                    {d.full_name} {d.phone ? `(${d.phone})` : ''}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Delivery Date & Time *</Form.Label>
                              <Form.Control
                                type="datetime-local"
                                required={scheduleDelivery}
                                min={minDeliveryTime}
                                value={deliveryDate}
                                onChange={e => setDeliveryDate(e.target.value)}
                              />
                              <Form.Text className="text-muted">
                                Must be at least {estimatedEta || '45'} minutes from now
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Delivery Zone</Form.Label>
                              <Form.Control
                                value={deliveryZone}
                                onChange={e => handleZoneChange(e.target.value)}
                                placeholder="Auto-filled from customer"
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Delivery Notes</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={deliveryNotes}
                            onChange={e => setDeliveryNotes(e.target.value)}
                            placeholder="Special instructions for the driver..."
                          />
                        </Form.Group>
                      </>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}

            {/* Notes */}
            <Form.Group className="mt-3">
              <Form.Label>Sale Notes (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" form="sale-form" type="submit" disabled={submitting}>
            {submitting ? 'Processing...' : scheduleDelivery ? 'Complete Sale & Schedule Delivery' : 'Complete Sale'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
