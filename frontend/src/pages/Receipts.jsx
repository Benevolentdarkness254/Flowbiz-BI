// frontend/src/pages/Receipts.jsx
// Receipt management page with list, void, and dispatch functionality
import { useState } from 'react'
import { Table, Button, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { receiptsApi } from '../api/receipts'

/**
 * Receipts page — lists all issued receipts.
 * Users with receipt.void can void receipts (with a reason).
 * Users with receipt.reprint can re-dispatch receipts via various channels.
 */
export default function Receipts() {
  const { can } = usePermission()

  // Fetch receipts with pagination
  const { data, loading, error, refetch } = useApi(
    () => receiptsApi.getReceipts({ page: 1, per_page: 50 }), []
  )

  // Void receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)

  // Dispatch receipt modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchChannel, setDispatchChannel] = useState('sms')
  const [dispatchDestination, setDispatchDestination] = useState('')
  const [dispatchLoading, setDispatchLoading] = useState(false)

  // Open void modal
  const openVoid = (receipt) => {
    setSelectedReceipt(receipt)
    setVoidReason('')
    setShowVoidModal(true)
  }

  // Execute void
  const handleVoid = async () => {
    if (!selectedReceipt || !voidReason) return
    setVoidLoading(true)

    try {
      await receiptsApi.voidReceipt(selectedReceipt.receipt_id, voidReason)
      setShowVoidModal(false)
      refetch()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to void receipt')
    } finally {
      setVoidLoading(false)
    }
  }

  // Open dispatch modal
  const openDispatch = (receipt) => {
    setSelectedReceipt(receipt)
    setDispatchChannel('sms')
    setDispatchDestination('')
    setShowDispatchModal(true)
  }

  // Execute dispatch
  const handleDispatch = async () => {
    if (!selectedReceipt) return
    if (dispatchChannel !== 'digital_only' && !dispatchDestination) {
      alert('Please provide a destination (phone number or email)')
      return
    }
    setDispatchLoading(true)

    try {
      await receiptsApi.dispatchReceipt(selectedReceipt.receipt_id, dispatchChannel, dispatchDestination)
      setShowDispatchModal(false)
      refetch()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to dispatch receipt')
    } finally {
      setDispatchLoading(false)
    }
  }

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <h5 className="mb-4">Receipts</h5>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Date</th>
            <th>KRA Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.receipts?.length === 0 && (
            <tr><td colSpan="8" className="text-center text-muted">No receipts found</td></tr>
          )}
          {data?.receipts?.map(r => (
            <tr key={r.receipt_id} style={r.voided ? { opacity: 0.5 } : {}}>
              <td>
                <code>{r.receipt_number}</code>
                {r.voided && <Badge bg="danger" className="ms-2">Voided</Badge>}
              </td>
              <td>{r.customer_name}</td>
              <td><Badge bg="secondary">{r.receipt_type}</Badge></td>
              <td>KES {parseFloat(r.amount_paid).toLocaleString()}</td>
              <td><Badge bg="info">{r.payment_method}</Badge></td>
              <td>{new Date(r.receipt_date).toLocaleDateString()}</td>
              <td>
                <Badge bg={
                  r.kra_status === 'accepted' ? 'success' :
                  r.kra_status === 'rejected' ? 'danger' :
                  r.kra_status === 'not_submitted' ? 'warning' : 'secondary'
                }>
                  {r.kra_status}
                </Badge>
              </td>
              <td>
                {!r.voided && (
                  <div className="btn-group btn-group-sm">
                    {can('receipt.reprint') && (
                      <Button variant="outline-secondary" size="sm" onClick={() => openDispatch(r)}>
                        Resend
                      </Button>
                    )}
                    {can('receipt.void') && (
                      <Button variant="outline-danger" size="sm" onClick={() => openVoid(r)}>
                        Void
                      </Button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Void Receipt Modal */}
      <Modal show={showVoidModal} onHide={() => setShowVoidModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Void Receipt {selectedReceipt?.receipt_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Voiding a receipt is permanent and cannot be undone.
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label>Reason *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              required
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              placeholder="Provide a reason for voiding this receipt..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVoidModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleVoid} disabled={voidLoading || !voidReason}>
            {voidLoading ? 'Voiding...' : 'Void Receipt'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Dispatch Receipt Modal */}
      <Modal show={showDispatchModal} onHide={() => setShowDispatchModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Resend Receipt {selectedReceipt?.receipt_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Channel</Form.Label>
            <Form.Select value={dispatchChannel} onChange={e => setDispatchChannel(e.target.value)}>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="pdf_email">Email (PDF)</option>
              <option value="digital_only">Digital Display</option>
            </Form.Select>
          </Form.Group>
          {dispatchChannel !== 'digital_only' && (
            <Form.Group className="mb-3">
              <Form.Label>Destination (phone or email)</Form.Label>
              <Form.Control
                value={dispatchDestination}
                onChange={e => setDispatchDestination(e.target.value)}
                placeholder={dispatchChannel === 'pdf_email' ? 'email@example.com' : '+2547XXXXXXXX'}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDispatchModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleDispatch} disabled={dispatchLoading}>
            {dispatchLoading ? 'Sending...' : 'Send'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
