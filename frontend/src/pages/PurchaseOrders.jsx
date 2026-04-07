// frontend/src/pages/PurchaseOrders.jsx
// Purchase order management with supplier details, pricing, approve/decline
import { useState, useEffect } from 'react'
import { Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col, InputGroup } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { purchaseOrdersApi } from '../api/purchaseOrders'
import { inventoryApi } from '../api/inventory'

/**
 * Purchase Orders page — lists all POs with status badges.
 * Users with po.create can create new POs with supplier dropdown and auto-filled pricing.
 * Users with po.approve can approve or decline pending POs.
 */
export default function PurchaseOrders() {
  const { can } = usePermission()

  // Fetch POs, products, and suppliers for reference dropdowns
  const { data, loading, error, refetch } = useApi(
    () => purchaseOrdersApi.getPurchaseOrders(), []
  )
  const { data: productsData } = useApi(() => inventoryApi.getProducts(), [])
  const { data: suppliersData } = useApi(() => inventoryApi.getSuppliers(), [])

  // Supplier pricing cache — keyed by supplier_id
  const [supplierPricing, setSupplierPricing] = useState({})

  // Create PO modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // PO form state
  const [supplierId, setSupplierId] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [poNotes, setPoNotes] = useState('')
  const [poItems, setPoItems] = useState([{ product_id: '', quantity: 1, unit_price: '' }])

  // Approve/decline modal state
  const [selectedPO, setSelectedPO] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('approve')
  const [declineReason, setDeclineReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch supplier pricing when supplier is selected
  useEffect(() => {
    if (supplierId && !supplierPricing[supplierId]) {
      inventoryApi.getSupplierPricing(supplierId)
        .then(res => {
          // Build a lookup map: product_id → pricing info
          const pricingMap = {}
          res.data.pricing.forEach(p => {
            pricingMap[p.product_id] = p
          })
          setSupplierPricing(prev => ({ ...prev, [supplierId]: pricingMap }))
        })
        .catch(() => {
          // If no pricing data exists, use an empty map
          setSupplierPricing(prev => ({ ...prev, [supplierId]: {} }))
        })
    }
  }, [supplierId])

  // Open create modal and reset form
  const openCreate = () => {
    setSupplierId('')
    setExpectedDelivery('')
    setPoNotes('')
    setPoItems([{ product_id: '', quantity: 1, unit_price: '' }])
    setSubmitError(null)
    setShowCreateModal(true)
  }

  // Add a line item row
  const addPOItem = () => {
    setPoItems([...poItems, { product_id: '', quantity: 1, unit_price: '' }])
  }

  // Remove a line item row
  const removePOItem = (index) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index))
    }
  }

  // Update a PO line item field
  const updatePOItem = (index, field, value) => {
    const updated = [...poItems]
    updated[index][field] = value

    // Auto-fill unit price from supplier pricing when product is selected
    if (field === 'product_id' && supplierId && supplierPricing[supplierId]) {
      const pricing = supplierPricing[supplierId][parseInt(value)]
      if (pricing && pricing.unit_cost) {
        updated[index].unit_price = pricing.unit_cost
      }
    }

    // Fallback: use product's retail price if no supplier pricing
    if (field === 'product_id' && !updated[index].unit_price && productsData?.products) {
      const product = productsData.products.find(p => p.product_id === parseInt(value))
      if (product) {
        updated[index].unit_price = product.price
      }
    }

    setPoItems(updated)
  }

  // Calculate PO total
  const calculateTotal = () => {
    return poItems.reduce((sum, item) => {
      const qty = parseInt(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + (qty * price)
    }, 0)
  }

  // Submit the new PO
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    if (!supplierId) {
      setSubmitError('Please select a supplier')
      setSubmitting(false)
      return
    }

    const items = poItems.map(item => ({
      product_id: parseInt(item.product_id),
      quantity: parseInt(item.quantity),
      unit_price: parseFloat(item.unit_price),
    }))

    if (items.some(i => !i.product_id || i.quantity < 1 || !i.unit_price)) {
      setSubmitError('Please fill in all product, quantity, and price fields')
      setSubmitting(false)
      return
    }

    try {
      await purchaseOrdersApi.createPurchaseOrder({
        supplier_id: parseInt(supplierId),
        expected_delivery: expectedDelivery || null,
        notes: poNotes || null,
        items,
      })
      setShowCreateModal(false)
      refetch()
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to create purchase order')
    } finally {
      setSubmitting(false)
    }
  }

  // Open approve/decline modal
  const openAction = (po, type) => {
    setSelectedPO(po)
    setActionType(type)
    setDeclineReason('')
    setShowActionModal(true)
  }

  // Execute approve or decline
  const executeAction = async () => {
    if (!selectedPO) return
    setActionLoading(true)

    try {
      if (actionType === 'approve') {
        await purchaseOrdersApi.approvePurchaseOrder(selectedPO.purchase_order_id)
      } else {
        if (!declineReason) {
          setActionLoading(false)
          return
        }
        await purchaseOrdersApi.declinePurchaseOrder(selectedPO.purchase_order_id, declineReason)
      }
      setShowActionModal(false)
      refetch()
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${actionType} purchase order`)
    } finally {
      setActionLoading(false)
    }
  }

  // Status badge color mapping
  const getStatusBadge = (status) => {
    const map = {
      draft: 'secondary',
      pending_approval: 'warning',
      approved: 'success',
      declined: 'danger',
      received: 'info',
      partial: 'info',
      cancelled: 'dark',
    }
    return map[status] || 'secondary'
  }

  // Look up supplier name by ID for the PO table
  const getSupplierName = (supplierId) => {
    const supplier = suppliersData?.suppliers?.find(s => s.supplier_id === supplierId)
    return supplier ? supplier.name : `Supplier #${supplierId}`
  }

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Purchase Orders</h5>
        {can('po.create') && (
          <Button variant="primary" size="sm" onClick={openCreate}>
            New Purchase Order
          </Button>
        )}
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>PO #</th>
            <th>Supplier</th>
            <th>Order Date</th>
            <th>Expected Delivery</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.purchase_orders?.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center text-muted">
                No purchase orders yet. Click "New Purchase Order" to create one.
              </td>
            </tr>
          )}
          {data?.purchase_orders?.map(po => (
            <tr key={po.purchase_order_id}>
              <td>#{po.purchase_order_id}</td>
              <td>{getSupplierName(po.supplier_id)}</td>
              <td>{new Date(po.order_date).toLocaleDateString()}</td>
              <td>{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '—'}</td>
              <td>KES {parseFloat(po.total_amount).toLocaleString()}</td>
              <td><Badge bg={getStatusBadge(po.status)}>{po.status.replace('_', ' ')}</Badge></td>
              <td>
                {po.status === 'pending_approval' && can('po.approve') && (
                  <div className="btn-group btn-group-sm">
                    <Button variant="success" size="sm" onClick={() => openAction(po, 'approve')}>
                      Approve
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => openAction(po, 'decline')}>
                      Decline
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Create PO Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>New Purchase Order</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {submitError && <Alert variant="danger">{submitError}</Alert>}

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Supplier *</Form.Label>
                  <Form.Select
                    required
                    value={supplierId}
                    onChange={e => {
                      setSupplierId(e.target.value)
                      // Reset items when supplier changes so pricing can reload
                      setPoItems([{ product_id: '', quantity: 1, unit_price: '' }])
                    }}
                  >
                    <option value="">Select a supplier</option>
                    {suppliersData?.suppliers?.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Expected Delivery</Form.Label>
                  <Form.Control
                    type="date"
                    value={expectedDelivery}
                    onChange={e => setExpectedDelivery(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Supplier info bar */}
            {supplierId && suppliersData?.suppliers && (
              <Alert variant="info" className="py-2 mb-3">
                <small>
                  {(() => {
                    const s = suppliersData.suppliers.find(s => s.supplier_id === parseInt(supplierId))
                    if (!s) return null
                    return (
                      <>
                        <strong>{s.name}</strong>
                        {s.address && ` — ${s.address}`}
                        {s.payment_terms && ` — Payment terms: ${s.payment_terms} days`}
                      </>
                    )
                  })()}
                </small>
              </Alert>
            )}

            <Form.Label>Items</Form.Label>
            <Table size="sm" bordered>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: 80 }}>Qty</th>
                  <th style={{ width: 120 }}>Unit Price</th>
                  <th style={{ width: 100 }}>Subtotal</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {poItems.map((item, index) => {
                  const qty = parseInt(item.quantity) || 0
                  const price = parseFloat(item.unit_price) || 0
                  const subtotal = qty * price

                  // Determine if this product has supplier-specific pricing
                  const pricing = supplierPricing[supplierId]?.[parseInt(item.product_id)]
                  const hasSupplierPrice = pricing && pricing.unit_cost

                  return (
                    <tr key={index}>
                      <td>
                        <Form.Select
                          required
                          value={item.product_id}
                          onChange={e => updatePOItem(index, 'product_id', e.target.value)}
                        >
                          <option value="">Select product</option>
                          {productsData?.products?.map(p => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} ({p.sku}) — Stock: {p.current_stock}
                            </option>
                          ))}
                        </Form.Select>
                        {hasSupplierPrice && (
                          <small className="text-success">
                            Supplier price: KES {pricing.unit_cost}
                          </small>
                        )}
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updatePOItem(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={e => updatePOItem(index, 'unit_price', e.target.value)}
                        />
                      </td>
                      <td className="text-end fw-bold">
                        KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        {poItems.length > 1 && (
                          <Button variant="outline-danger" size="sm" onClick={() => removePOItem(index)}>×</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="text-end fw-bold">Total:</td>
                  <td className="text-end fw-bold fs-5">
                    KES {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </Table>

            <Button variant="outline-secondary" size="sm" onClick={addPOItem}>
              + Add Item
            </Button>

            <Form.Group className="mt-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={poNotes}
                onChange={e => setPoNotes(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create PO'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Approve/Decline Confirmation Modal */}
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === 'approve' ? 'Approve Purchase Order' : 'Decline Purchase Order'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionType === 'decline' && (
            <Form.Group className="mb-3">
              <Form.Label>Reason for Declining *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Provide a reason for declining this purchase order..."
              />
            </Form.Group>
          )}
          {actionType === 'approve' && (
            <p>Are you sure you want to approve PO #{selectedPO?.purchase_order_id}?</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActionModal(false)}>Cancel</Button>
          <Button
            variant={actionType === 'approve' ? 'success' : 'danger'}
            onClick={executeAction}
            disabled={actionLoading || (actionType === 'decline' && !declineReason)}
          >
            {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Decline'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
