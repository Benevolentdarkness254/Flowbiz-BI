// frontend/src/pages/Customers.jsx
// Customer management page with permission-based UI elements
import { Table, Button, Spinner, Alert } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { customersApi } from '../api/customers'
import { useNavigate } from 'react-router-dom'

/**
 * Displays a list of customers.
 * The "New Customer" button and "Edit" actions are gated behind permissions.
 */
export default function Customers() {
  const { can } = usePermission()
  const navigate = useNavigate()
  const { data, loading, error } = useApi(() => customersApi.getCustomers(), [])

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Customers</h5>
        {can('customer.create') && (
          <Button variant="primary" onClick={() => navigate('/customers/create')}>
            New Customer
          </Button>
        )}
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.customers.map((customer) => (
            <tr key={customer.customer_id}>
              <td>{customer.customer_id}</td>
              <td>{customer.full_name}</td>
              <td>{customer.email}</td>
              <td>{customer.phone_number}</td>
              <td>
                <span className={`badge ${customer.is_active ? 'bg-success' : 'bg-secondary'}`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                {can('customer.manage') && (
                  <div className="btn-group btn-group-sm" role="group">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => navigate(`/customers/${customer.customer_id}/edit`)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
