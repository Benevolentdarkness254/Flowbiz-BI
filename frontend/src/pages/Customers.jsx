// frontend/src/pages/Customers.jsx
// Customer management page with CRUD operations and permission-based UI elements
import { useState } from 'react'
import { Table, Button, Spinner, Alert, Modal, Form, Badge } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { salesApi } from '../api/sales'
import { useNavigate } from 'react-router-dom'

/**
 * Displays a list of customers with create/edit capabilities.
 * Uses the sales API for customer endpoints (backend: /api/sales/customers).
 * The "New Customer" button is gated behind customer.manage permission.
 */
export default function Customers() {
  const { can } = usePermission()
  const navigate = useNavigate()
  // Fetch customers from the correct backend endpoint
  const { data, loading, error, refetch } = useApi(
    () => salesApi.getCustomers(),
    []
  )

  // State for the create/edit modal
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    customer_type: 'walk_in',
    phone: '',
    email: '',
    address: '',
    zone: '',
    credit_limit: 0,
    kra_pin: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Open modal to create a new customer
  const handleCreate = () => {
    setEditingCustomer(null)
    setFormData({
      name: '',
      customer_type: 'walk_in',
      phone: '',
      email: '',
      address: '',
      zone: '',
      credit_limit: 0,
      kra_pin: '',
    })
    setSubmitError(null)
    setShowModal(true)
  }

  // Open modal to edit an existing customer
  const handleEdit = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      customer_type: customer.customer_type,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      zone: customer.zone || '',
      credit_limit: customer.credit_limit || 0,
      kra_pin: customer.kra_pin || '',
    })
    setSubmitError(null)
    setShowModal(true)
  }

  // Submit the form for create or update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      if (editingCustomer) {
        // Update existing customer
        await salesApi.updateCustomer(editingCustomer.customer_id, formData)
      } else {
        // Create new customer
        await salesApi.createCustomer(formData)
      }
      setShowModal(false)
      refetch() // Refresh the customer list
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.response?.data?.errors || 'Failed to save customer')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Customers</h5>
        {can('customer.manage') && (
          <Button variant="primary" size="sm" onClick={handleCreate}>
            New Customer
          </Button>
        )}
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Type</th>
            <th>Phone</th>
            <th>Zone</th>
            <th>Credit Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.customers?.length === 0 && (
            <tr>
              <td colSpan="8" className="text-center text-muted">
                No customers found. Click "New Customer" to add one.
              </td>
            </tr>
          )}
          {data?.customers?.map((customer) => (
            <tr key={customer.customer_id}>
              <td>{customer.customer_id}</td>
              <td>{customer.name}</td>
              <td>
                <Badge bg={
                  customer.customer_type === 'wholesale' ? 'info' :
                  customer.customer_type === 'account' ? 'primary' : 'secondary'
                }>
                  {customer.customer_type?.replace('_', ' ')}
                </Badge>
              </td>
              <td>{customer.phone || '—'}</td>
              <td>{customer.zone || '—'}</td>
              <td>KES {parseFloat(customer.credit_balance || 0).toLocaleString()}</td>
              <td>
                <Badge bg={customer.is_active ? 'success' : 'secondary'}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td>
                {can('customer.manage') && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleEdit(customer)}
                  >
                    Edit
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Create/Edit Customer Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingCustomer ? 'Edit Customer' : 'New Customer'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {submitError && <Alert variant="danger">{submitError}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Customer Type</Form.Label>
              <Form.Select
                value={formData.customer_type}
                onChange={e => setFormData({ ...formData, customer_type: e.target.value })}
              >
                <option value="walk_in">Walk-in</option>
                <option value="account">Account</option>
                <option value="wholesale">Wholesale</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Zone</Form.Label>
              <Form.Control
                value={formData.zone}
                onChange={e => setFormData({ ...formData, zone: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Credit Limit (KES)</Form.Label>
              <Form.Control
                type="number"
                value={formData.credit_limit}
                onChange={e => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>KRA PIN</Form.Label>
              <Form.Control
                value={formData.kra_pin}
                onChange={e => setFormData({ ...formData, kra_pin: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
