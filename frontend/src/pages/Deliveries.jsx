// frontend/src/pages/Deliveries.jsx
// Enhanced delivery tracking with OpenStreetMap, manifest, ETA, and routing
import { useState, useEffect } from 'react'
import {
  Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col, Tabs, Tab, Card, ListGroup
} from 'react-bootstrap'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { deliveriesApi } from '../api/deliveries'

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom marker icons by delivery status
const createStatusIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  in_transit: '#f59e0b',
  delivered: '#10b981',
  failed: '#ef4444',
  rescheduled: '#8b5cf6',
}

// Default Nairobi coordinates (fallback when GPS data is missing)
const DEFAULT_CENTER = [-1.2921, 36.8219]
const DEFAULT_ZOOM = 12

/**
 * Enhanced Deliveries page with:
 * - OpenStreetMap showing delivery markers with status colors
 * - Delivery detail modal with goods manifest, customer info, driver info, ETA
 * - Status timeline and progress tracker
 * - Auto-estimated ETA based on zone
 * - Tab for outbound (with map) and inbound deliveries
 */
export default function Deliveries() {
  const { can } = usePermission()
  const [activeTab, setActiveTab] = useState('outbound')

  // Outbound delivery data
  const { data: outboundData, loading: outboundLoading, error: outboundError, refetch: refetchOutbound } = useApi(
    () => deliveriesApi.getOutboundDeliveries({ page: 1, per_page: 50 }), []
  )

  // Inbound delivery data
  const { data: inboundData, loading: inboundLoading, error: inboundError, refetch: refetchInbound } = useApi(
    () => deliveriesApi.getInboundDeliveries({ page: 1, per_page: 50 }), []
  )

  // Delivery detail modal state
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [manifest, setManifest] = useState(null)
  const [manifestLoading, setManifestLoading] = useState(false)

  // Update delivery status modal
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  // Map center — adjust when deliveries load
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)

  // Update map center when deliveries load with GPS data
  useEffect(() => {
    const deliveries = outboundData?.deliveries || []
    const withGps = deliveries.filter(d => d.latitude && d.longitude)
    if (withGps.length > 0) {
      // Center map on the first delivery with GPS
      setMapCenter([parseFloat(withGps[0].latitude), parseFloat(withGps[0].longitude)])
    }
  }, [outboundData])

  // Open delivery detail modal and fetch the goods manifest
  const openDetail = async (delivery) => {
    setSelectedDelivery(delivery)
    setManifest(null)
    setManifestLoading(true)
    setShowDetailModal(true)

    try {
      const res = await deliveriesApi.getDeliveryManifest(delivery.delivery_id)
      setManifest(res.data.manifest)
    } catch {
      setManifest([])
    } finally {
      setManifestLoading(false)
    }
  }

  // Open status update modal
  const openUpdate = (delivery) => {
    setSelectedDelivery(delivery)
    setUpdateStatus(delivery.status)
    setUpdateNotes(delivery.delivery_notes || '')
    setShowUpdateModal(true)
  }

  // Submit delivery status update
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

  // Calculate ETA display text
  const getEtaText = (delivery) => {
    if (delivery.status === 'delivered') {
      return `Delivered at ${new Date(delivery.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    if (delivery.eta_minutes) {
      const scheduled = new Date(delivery.scheduled_date)
      const eta = new Date(scheduled.getTime() + delivery.eta_minutes * 60000)
      return `ETA: ${eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${delivery.eta_minutes} min)`
    }
    return 'ETA: Calculating...'
  }

  // Status badge color
  const getStatusBadge = (status) => STATUS_COLORS[status] ? {
    scheduled: 'primary',
    in_transit: 'warning',
    delivered: 'success',
    failed: 'danger',
    rescheduled: 'info',
  }[status] || 'secondary' : 'secondary'

  // Status progress steps for the timeline
  const getStatusSteps = (currentStatus) => {
    const steps = ['scheduled', 'in_transit', 'delivered']
    const currentIndex = steps.indexOf(currentStatus)
    return steps.map((step, i) => ({
      label: step.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      completed: i <= currentIndex,
      current: i === currentIndex,
    }))
  }

  if (outboundLoading || inboundLoading) return <Spinner animation="border" />
  if (outboundError) return <Alert variant="danger">{outboundError}</Alert>

  // Build map markers from deliveries with GPS coordinates
  const mapMarkers = (outboundData?.deliveries || [])
    .filter(d => d.latitude && d.longitude)
    .map(d => ({
      id: d.delivery_id,
      position: [parseFloat(d.latitude), parseFloat(d.longitude)],
      customer: d.customer_name,
      status: d.status,
      eta: getEtaText(d),
    }))

  return (
    <div>
      <h5 className="mb-4">Delivery Tracking</h5>

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)}>
        {/* ============================================================ */}
        {/* TAB 1: Outbound Deliveries with Map */}
        {/* ============================================================ */}
        <Tab eventKey="outbound" title="Outbound">
          <Row className="g-3">
            {/* Map Panel */}
            <Col md={7}>
              <Card>
                <Card.Header>
                  <strong>Delivery Map</strong>
                  <Badge bg="secondary" className="ms-2">
                    {mapMarkers.length} on map
                  </Badge>
                </Card.Header>
                <Card.Body style={{ padding: 0 }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={DEFAULT_ZOOM}
                    style={{ height: 500, width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {mapMarkers.map(m => (
                      <Marker
                        key={m.id}
                        position={m.position}
                        icon={createStatusIcon(STATUS_COLORS[m.status] || '#666')}
                      >
                        <Popup>
                          <strong>{m.customer}</strong><br />
                          Status: {m.status}<br />
                          {m.eta}
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </Card.Body>
              </Card>

              {/* Legend */}
              <div className="mt-2 d-flex gap-3 flex-wrap">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <span key={status} className="d-flex align-items-center gap-1 small">
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      backgroundColor: color, display: 'inline-block'
                    }} />
                    {status.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </Col>

            {/* Delivery List Panel */}
            <Col md={5}>
              <Card>
                <Card.Header><strong>Deliveries</strong></Card.Header>
                <Card.Body style={{ maxHeight: 500, overflow: 'auto' }}>
                  <ListGroup variant="flush">
                    {(outboundData?.deliveries || []).length === 0 && (
                      <ListGroup.Item className="text-center text-muted">No outbound deliveries</ListGroup.Item>
                    )}
                    {(outboundData?.deliveries || []).map(d => (
                      <ListGroup.Item
                        key={d.delivery_id}
                        action
                        onClick={() => openDetail(d)}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>#{d.delivery_id}</strong> — {d.customer_name}
                          <div className="small text-muted">
                            {d.driver_name} • {d.delivery_zone || 'No zone'}
                          </div>
                        </div>
                        <div className="text-end">
                          <Badge bg={getStatusBadge(d.status)}>{d.status.replace('_', ' ')}</Badge>
                          <div className="small text-muted mt-1">{getEtaText(d)}</div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* ============================================================ */}
        {/* TAB 2: Inbound Deliveries */}
        {/* ============================================================ */}
        <Tab eventKey="inbound" title="Inbound">
          {inboundError && <Alert variant="danger">{inboundError}</Alert>}
          {inboundData && (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Supplier</th>
                  <th>Received By</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Status</th>
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
                    <td>{d.received_by_name}</td>
                    <td>{new Date(d.delivery_date).toLocaleDateString()}</td>
                    <td>{d.item_count || 0} items</td>
                    <td><Badge bg={getStatusBadge(d.status)}>{d.status.replace('_', ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tab>
      </Tabs>

      {/* ============================================================ */}
      {/* DELIVERY DETAIL MODAL */}
      {/* ============================================================ */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Delivery #{selectedDelivery?.delivery_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDelivery && (
            <>
              {/* Status Progress Bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  {getStatusSteps(selectedDelivery.status).map((step, i) => (
                    <div key={step.label} className="text-center flex-fill">
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        backgroundColor: step.completed ? '#10b981' : '#e5e7eb',
                        color: step.completed ? 'white' : '#9ca3af',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 'bold',
                      }}>
                        {step.completed ? '✓' : i + 1}
                      </div>
                      <div className="small mt-1">{step.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Row>
                {/* Customer Info */}
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="py-2"><strong>Customer</strong></Card.Header>
                    <Card.Body className="py-2">
                      <p className="mb-1"><strong>{selectedDelivery.customer_name}</strong></p>
                      <p className="mb-1 small text-muted">Zone: {selectedDelivery.delivery_zone || '—'}</p>
                      {selectedDelivery.latitude && selectedDelivery.longitude && (
                        <p className="mb-1 small text-muted">
                          GPS: {selectedDelivery.latitude}, {selectedDelivery.longitude}
                        </p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                {/* Driver & ETA Info */}
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="py-2"><strong>Driver & ETA</strong></Card.Header>
                    <Card.Body className="py-2">
                      <p className="mb-1"><strong>{selectedDelivery.driver_name}</strong></p>
                      <p className="mb-1 small text-muted">{getEtaText(selectedDelivery)}</p>
                      <p className="mb-1 small text-muted">
                        Scheduled: {new Date(selectedDelivery.scheduled_date).toLocaleString()}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Goods Manifest */}
              <Card className="mb-3">
                <Card.Header className="py-2"><strong>Goods Manifest</strong></Card.Header>
                <Card.Body className="py-2">
                  {manifestLoading ? (
                    <><Spinner size="sm" className="me-2" /> Loading manifest...</>
                  ) : manifest && manifest.length > 0 ? (
                    <Table size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manifest.map((item, i) => (
                          <tr key={i}>
                            <td>{item.product_name}</td>
                            <td><code>{item.sku}</code></td>
                            <td>{item.quantity}</td>
                            <td>KES {parseFloat(item.unit_price).toLocaleString()}</td>
                            <td>KES {parseFloat(item.subtotal).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted mb-0 small">No manifest data available</p>
                  )}
                </Card.Body>
              </Card>

              {/* Delivery Notes */}
              {selectedDelivery.delivery_notes && (
                <Card>
                  <Card.Header className="py-2"><strong>Notes</strong></Card.Header>
                  <Card.Body className="py-2">
                    <p className="mb-0 small">{selectedDelivery.delivery_notes}</p>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {can('delivery.outbound.update') && selectedDelivery?.status !== 'delivered' && (
            <Button variant="outline-primary" size="sm" onClick={() => {
              setShowDetailModal(false)
              openUpdate(selectedDelivery)
            }}>
              Update Status
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================ */}
      {/* UPDATE STATUS MODAL */}
      {/* ============================================================ */}
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
