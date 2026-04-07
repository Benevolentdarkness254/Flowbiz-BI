// frontend/src/pages/OutboundDeliveryDetail.jsx
// Detailed view of an outbound delivery with map tracking
import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Alert } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { deliveriesApi } from '../api/deliveries'
import DeliveryMap from '../components/common/DeliveryMap'
import { useParams, useNavigate } from 'react-router-dom'

export default function OutboundDeliveryDetail() {
  const { deliveryId } = useParams()
  const { can } = usePermission()
  const navigate = useNavigate()

  const { data: delivery, loading, error } = useApi(
    () => deliveriesApi.getOutboundDeliveryDetail(deliveryId),
    []
  )

  const handleBack = () => {
    navigate(-1)
  }

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

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>
  if (!delivery) return <Alert variant="warning">Loading delivery details...</Alert>

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <Button variant="outline-secondary" onClick={handleBack}>
            ← Back to Deliveries
          </Button>
          <h4>Outbound Delivery Details</h4>
        </Col>
      </Row>

      {/* Delivery Info Card */}
      <Card className="mb-4">
        <Card.Header>
          <h5>Delivery #{delivery.delivery_id}</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Table borderless>
                <tbody>
                  <tr>
                    <th>Customer:</th>
                    <td>{delivery.customer_name}</td>
                  </tr>
                  <tr>
                    <th>Driver:</th>
                    <td>{delivery.driver_name}</td>
                  </tr>
                  <tr>
                    <th>Scheduled:</th>
                    <td>{new Date(delivery.scheduled_date).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th>Delivered:</th>
                    <td>
                      {delivery.delivered_at ? (
                        new Date(delivery.delivered_at).toLocaleString()
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Status:</th>
                    <td>
                      <Badge bg={getStatusBadge(delivery.status)}>
                        {delivery.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <th>Zone:</th>
                    <td>{delivery.delivery_zone || '—'}</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
            <Col md={6}>
              <Table borderless>
                <tbody>
                  <tr>
                    <th>Transaction:</th>
                    <td>#{delivery.transaction_id}</td>
                  </tr>
                  <tr>
                    <th>Payment Status:</th>
                    <td>
                      <Badge bg={delivery.payment_status === 'paid' ? 'success' : 'warning'}>
                        {delivery.payment_status}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <th>Payment Method:</th>
                    <td>{delivery.payment_method || '—'}</td>
                  </tr>
                  <tr>
                    <th>Total Amount:</th>
                    <td>${delivery.total_amount?.toFixed(2) || '0.00'}</td>
                  </tr>
                  <tr>
                    <th>Signature Captured:</th>
                    <td>
                      {delivery.signature_captured ? (
                        <span className="text-success">Yes</span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Delivery Items */}
      <Card className="mb-4">
        <Card.Header>
          <h5>Delivery Items</h5>
        </Card.Header>
        <Card.Body>
          {delivery.items && delivery.items.length > 0 ? (
            <Table striped hover>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {delivery.items.map(item => (
                  <tr key={item.sku}>
                    <td>{item.name}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>${item.unit_price.toFixed(2)}</td>
                    <td>${item.discount.toFixed(2)}</td>
                    <td>${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-muted">No items found for this delivery.</p>
          )}
        </Card.Body>
      </Card>

      {/* Delivery Notes */}
      {delivery.delivery_notes && (
        <Card className="mb-4">
          <Card.Header>
            <h5>Delivery Notes</h5>
          </Card.Header>
          <Card.Body>
            <p>{delivery.delivery_notes}</p>
          </Card.Body>
        </Card>
      )}

      {/* Map Section */}
      <Card>
        <Card.Header>
          <h5>Delivery Tracking</h5>
        </Card.Header>
        <Card.Body>
          <DeliveryMap
            location={{
              lat: parseFloat(delivery.location?.last_lat || 0),
              lng: parseFloat(delivery.location?.last_lng || 0)
            }}
            customerLocation={{
              lat: parseFloat(delivery.customer_lat || 0),
              lng: parseFloat(delivery.customer_lng || 0)
            }}
            driverLocation={{
              lat: parseFloat(delivery.driver_lat || 0),
              lng: parseFloat(delivery.driver_lng || 0)
            }}
            height={400}
          />
          
          {delivery.location?.last_location_update && (
            <p className="text-muted small mt-2">
              Last location update: {new Date(delivery.location.last_location_update).toLocaleString()}
            </p>
          )}
        </Card.Body>
      </Card>
    </Container>
  )
}