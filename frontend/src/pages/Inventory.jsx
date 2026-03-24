// frontend/src/pages/Inventory.jsx
import { Table, Badge, Spinner, Alert, Button } from 'react-bootstrap'
import { useApi }        from '../hooks/useApi'
import { usePermission } from '../hooks/usePermissions'
import { inventoryApi }  from '../api/inventory'
import StatusBadge       from '../components/common/StatusBadge'

export default function Inventory() {
  const { can }    = usePermission()
  const { data, loading, error } = useApi(() => inventoryApi.getStatus(), [])

  if (loading) return <Spinner animation="border" />
  if (error)   return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Inventory Status</h5>
        {can('inventory.adjust') && (
          <Button size="sm" variant="outline-secondary">Manual Adjustment</Button>
        )}
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>SKU</th><th>Product</th><th>Category</th>
            <th>Stock</th><th>Min Level</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.inventory.map(p => (
            <tr key={p.product_id}>
              <td><code>{p.sku}</code></td>
              <td>{p.name}</td>
              <td>{p.category.replace('_', ' ')}</td>
              <td>{p.current_stock} {p.unit_of_measure}</td>
              <td>{p.min_stock_level}</td>
              <td><StatusBadge status={p.stock_status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}