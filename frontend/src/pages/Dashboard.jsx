// frontend/src/pages/Dashboard.jsx
import { Row, Col, Alert }  from 'react-bootstrap'
import { usePermission }    from '../hooks/usePermission'
import { useApi }           from '../hooks/useApi'
import { biApi }            from '../api/bi'
import { inventoryApi }     from '../api/inventory'
import StatCard             from '../components/common/StatCard'

/**
 * The dashboard adapts based on permissions — not role names.
 * Every StatCard and widget is conditionally rendered by can().
 * The business owner sees all cards. Sales staff see fewer.
 * No role-specific components — one dashboard, filtered by permissions.
 */
export default function Dashboard() {
  const { can } = usePermission()

  const { data: stats, loading: statsLoading } =
    useApi(() => biApi.getDashboard(), [])

  const { data: alertData, loading: alertsLoading } =
    useApi(() => inventoryApi.getAlerts(), [])

  return (
    <div>
      <h5 className="mb-4">Dashboard</h5>

      <Row className="g-3 mb-4">
        {/* Revenue card — only for users who can view reports */}
        {can('report.view') && (
          <Col md={3}>
            <StatCard
              title   = "Today's Revenue"
              value   = {`KES ${(stats?.stats.today_revenue ?? 0).toLocaleString()}`}
              variant = "success"
              loading = {statsLoading}
            />
          </Col>
        )}

        {/* Transactions — visible to sales staff */}
        {can('sale.view') && (
          <Col md={3}>
            <StatCard
              title   = "Transactions Today"
              value   = {stats?.stats.today_transactions ?? 0}
              variant = "primary"
              loading = {statsLoading}
            />
          </Col>
        )}

        {/* Stock alerts — visible to inventory staff */}
        {can('inventory.view') && (
          <Col md={3}>
            <StatCard
              title    = "Stock Alerts"
              value    = {alertData?.alerts.length ?? 0}
              variant  = {alertData?.alerts.length > 0 ? 'warning' : 'success'}
              loading  = {alertsLoading}
            />
          </Col>
        )}

        {/* Pending POs — visible to approvers */}
        {can('po.approve') && (
          <Col md={3}>
            <StatCard
              title   = "Pending Approvals"
              value   = {stats?.stats.pending_pos ?? 0}
              variant = "warning"
              loading = {statsLoading}
            />
          </Col>
        )}
      </Row>

      {/* Stock alert list — inventory staff */}
      {can('inventory.view') && alertData?.alerts.length > 0 && (
        <Alert variant="warning">
          <strong>Low Stock:</strong>{' '}
          {alertData.alerts.slice(0, 3).map(a => a.product_name).join(', ')}
          {alertData.alerts.length > 3 && ` and ${alertData.alerts.length - 3} more`}
        </Alert>
      )}
    </div>
  )
}