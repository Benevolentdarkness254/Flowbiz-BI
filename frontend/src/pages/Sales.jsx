// frontend/src/pages/Sales.jsx
import { useState }    from 'react'
import { Table, Button, Badge, Spinner, Alert } from 'react-bootstrap'
import { useApi }      from '../hooks/useApi'
import { usePermission } from '../hooks/usePermissions'
import { salesApi }    from '../api/sales'
import StatusBadge     from '../components/common/StatusBadge'

export default function Sales() {
  const { can }    = usePermission()
  const { data, loading, error } = useApi(
    () => salesApi.getTransactions({ page: 1, per_page: 25 }), []
  )

  if (loading) return <Spinner animation="border" />
  if (error)   return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Sales Transactions</h5>
        {can('sale.create') && (
          <Button size="sm">New Sale</Button>
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
          {data?.transactions.map(txn => (
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
    </div>
  )
}