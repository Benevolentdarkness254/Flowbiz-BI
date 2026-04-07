// frontend/src/pages/EnhancedDeliveries.jsx
// Enhanced delivery management page with map tracking for outbound and countdown view for inbound
import { useState } from 'react'
import { Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col, Tabs, Tab } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { deliveriesApi } from '../api/deliveries'
import DeliveryMap from '../components/common/DeliveryMap'
import CountdownTimer from '../components/common/CountdownTimer'

/**
 * Enhanced Deliveries page — two tabs:
 * 1. Outbound: Customer deliveries with GPS tracking and map visualization.
 * 2. Inbound: Supplier deliveries with countdown timer and detailed receiving view.
 */
export default function EnhancedDeliveries() {
  const { can } = usePermission()
  const [activeTab, setActiveTab] = useState('outbound')

  // Outbound delivery state
  const { data: outboundData, loading: outboundLoading, error: outboundError, refetch: refetchOutbound } = useApi(
    () => deliveriesApi.getOutboundDeliveries({ page: 1, per_page: 50 }), []
  )

  // Inbound delivery state
  const { data: inboundData, loading: inboundLoading, error: inboundError, refetch: refetchInbound } = useApi(
    () => deliveriesApi.getInboundDeliveries({ page: 1, per_page: 50 }), []
  )

  // Update outbound delivery modal
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  // Open the update modal for an outbound delivery
  const openUpdate = (delivery) => {
    setSelectedDelivery(delivery)
    setUpdateStatus(delivery.status)
    setUpdateNotes(delivery.delivery_notes || '')
    setShowUpdateModal(true)
  }

  // Submit the delivery status update
  const handleUpdate = async () => {
    if (!selectedDelivery) return
    setUpdateLoading(true)

    try {
      await deliveriesApi.updateOutboundDelivery(selectedDelivery.delivery_id, {
        status: updateStatus,
        delivery_notes: updateNotes,
        signature_captured: updateStatus === 'delivered',
      })
      setShowUpdateModal(false)
      refetchOutbound()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update delivery')
    } finally {
      setUpdateLoading(false)
    }
  }

  // Status badge color mapping
  const getStatusBadge = (status) => {
    const map = {
      scheduled: 'primary',
      in_transit: 'warning',
      delivered: 'success',
      failed: 'danger',
      rescheduled: 'info',
      pending: 'secondary',
      partial: 'warning',
      complete: 'success',
      rejected: 'danger',
    }
    return map[status] || 'secondary'
  }

  return (
    <div>
      <h5 className="mb-4">Enhanced Deliveries</h5>

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)}>
        {/* ============================================================ */}
        {/* TAB 1: Outbound Deliveries (to customers) with Map Tracking */}
        {/* ============================================================ */}
        <Tab eventKey="outbound" title="Outbound">
          {outboundLoading && <Spinner animation="border" />}
          {outboundError && <Alert variant="danger">{outboundError}</Alert>}

          {outboundData && (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Driver</th>
                  <th>Zone</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {outboundData.deliveries?.length === 0 && (
                  <tr><td colSpan="7" className="text-center text-muted">No outbound deliveries</td></tr>
                )}
                {outboundData.deliveries?.map(d => (
                  <tr key={d.delivery_id}>
                    <td>#{d.delivery_id}</td>
                    <td>{d.customer_name}</td>
                    <td>{d.driver_name}</td>
                    <td>{d.delivery_zone || '—'}</td>
                    <td>{new Date(d.scheduled_date).toLocaleDateString()}</td>
                    <td><Badge bg={getStatusBadge(d.status)}>{d.status.replace('_', ' ')}</Badge></td>
                    <td>
                      {can('delivery.outbound.update') && d.status !== 'delivered' && (
                        <Button variant="outline-primary" size="sm" onClick={() => openUpdate(d)}>
                          Update
                        </Button>
                      )}
                      {can('delivery.outbound.view') && (
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            // Navigate to outbound delivery detail page with map
                            // This would be implemented with react-router
                            alert('View delivery details with map tracking')
                          }}
                        >
                          Track
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tab>

        {/* ============================================================ */}
        {/* TAB 2: Inbound Deliveries (from suppliers) with Countdown */}
        {/* ============================================================ */}
        <Tab eventKey="inbound" title="Inbound">
          {inboundLoading && <Spinner animation="border" />}
          {inboundError && <Alert variant="danger">{inboundError}</Alert>}

          {inboundData && (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Supplier</th>
                  <th>Expected</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inboundData.deliveries?.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted">No inbound deliveries</td></tr>
                )}
                {inboundData.deliveries?.map(d => (
                  <tr key={d.delivery_id}>
                    <td>#{d.delivery_id}</td>
                    <td>{d.supplier_name}</td>
                    <td>
                      {d.expected_delivery ? (
                        <div>
                          <small>{new Date(d.expected_delivery).toLocaleDateString()}</small><br/>
                          <CountdownTimer targetDate={d.expected_delivery} />
                        </div>
                      ) : '—'}
                    </td>
                    <td>{d.total_received || 0} / {d.total_expected || 0}</td>
                    <td><Badge bg={getStatusBadge(d.status)}>{d.status.replace('_', ' ')}</Badge></td>
                    <td>
                      {can('delivery.inbound.view') && (
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            // Navigate to inbound delivery detail page with countdown
                            alert('View inbound delivery details with countdown')
                          }}
                        >
                          Details
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tab>
      </Tabs>

      {/* Update Outbound Delivery Modal */}
      <Modal show={showUpdateModal} onHide={() => setShowUpdateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Delivery #{selectedDelivery?.delivery_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}>
              <option value="scheduled">Scheduled</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="rescheduled">Rescheduled</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={updateNotes}
              onChange={e => setUpdateNotes(e.target.value)}
              placeholder="Add delivery notes..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdate} disabled={updateLoading}>
            {updateLoading ? 'Updating...' : 'Update'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}