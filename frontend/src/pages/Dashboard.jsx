// frontend/src/pages/Dashboard.jsx
// Role-based dashboard with rich charts and graphs for every role
import { Row, Col, Card, Alert, Table, Badge, Spinner, Tabs, Tab } from 'react-bootstrap'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import { usePermission } from '../hooks/usePermission'
import { useApi } from '../hooks/useApi'
import { biApi } from '../api/bi'
import { inventoryApi } from '../api/inventory'
import StatCard from '../components/common/StatCard'

// Color palettes
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const STATUS_COLORS = { healthy: '#10b981', low_stock: '#f59e0b', out_of_stock: '#ef4444' }

/**
 * Dashboard renders different views with charts based on the user's role:
 * - Admin: System health + DB metrics + audit activity charts
 * - Owner: Business analytics with revenue trends + payment breakdown
 * - Sales Staff: Sales performance, top products, daily trends
 * - Inventory Staff: Stock levels, movement types, category breakdown
 * - Driver: Delivery stats, weekly trend, zone distribution
 */
export default function Dashboard() {
  const { can } = usePermission()

  // Determine which dashboard view to show based on role
  const isAdmin = can('system.config')
  const isOwner = can('report.generate') && !isAdmin
  const isSales = can('sale.create') && !isAdmin && !isOwner
  const isInventory = can('inventory.adjust') && !isAdmin && !isOwner
  const isDriver = can('delivery.outbound.update') && !isAdmin && !isOwner && !isSales && !isInventory

  // Shared data fetches
  const { data: stats, loading: statsLoading } = useApi(() => biApi.getDashboard(), [])
  const { data: alertData, loading: alertsLoading } = useApi(() => inventoryApi.getAlerts(), [])

  // Role-specific data
  const { data: salesDash } = useApi(() => biApi.getSalesDashboard(), [], isSales)
  const { data: inventoryDash } = useApi(() => biApi.getInventoryDashboard(), [], isInventory)
  const { data: driverDash } = useApi(() => biApi.getDriverDashboard(), [], isDriver)
  const { data: adminDash } = useApi(() => biApi.getAdminDashboard(), [], isAdmin)

  // ============================================================
  // ADMIN DASHBOARD — System health + IT metrics with charts
  // Note: Admin (system_admin role) only has technical permissions
  // (user.*, system.*). Business metrics (sales, inventory, POs, etc.)
  // are hidden since they require business permissions.
  // ============================================================
  if (isAdmin) {
    const health = adminDash?.system_health || {}
    const userRoles = adminDash?.user_roles_distribution || []
    const auditActivity = adminDash?.audit_activity || []
    const tableSizes = adminDash?.table_sizes || []

    return (
      <div>
        <h5 className="mb-4">Admin Dashboard</h5>

        {/* System Health Panel — only system-level metrics */}
        <Card className="mb-4">
          <Card.Header className="bg-dark text-white"><strong>System Health</strong></Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={3}><StatCard title="Database Size" value={`${health.database_size_mb || 0} MB`} variant="info" /></Col>
              <Col md={3}><StatCard title="Active Users" value={`${health.active_users || 0} / ${health.total_users || 0}`} variant="primary" /></Col>
              <Col md={3}><StatCard title="Errors (24h)" value={health.errors_24h || 0} variant={health.errors_24h > 0 ? 'danger' : 'success'} /></Col>
              <Col md={3}><StatCard title="Recent Logins (7d)" value={health.recent_logins_7d || 0} variant="success" /></Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Charts Row */}
        <Row className="g-3 mb-4">
          {/* User Roles Distribution */}
          <Col md={4}>
            <Card className="p-3">
              <Card.Title>User Roles Distribution</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={userRoles} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {userRoles.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Audit Activity (7 days) */}
          <Col md={8}>
            <Card className="p-3">
              <Card.Title>Audit Activity (Last 7 Days)</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={auditActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="creates" stackId="1" stroke="#10b981" fill="#10b981" name="Creates" />
                  <Area type="monotone" dataKey="updates" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Updates" />
                  <Area type="monotone" dataKey="deletes" stackId="1" stroke="#ef4444" fill="#ef4444" name="Deletes" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Database Table Sizes */}
        {tableSizes.length > 0 && (
          <Card className="p-3 mb-4">
            <Card.Title>Database Table Sizes</Card.Title>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tableSizes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={v => `${v} MB`} />
                <YAxis type="category" dataKey="table" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v} MB`} />
                <Legend />
                <Bar dataKey="data_mb" stackId="size" fill="#3b82f6" name="Data" />
                <Bar dataKey="index_mb" stackId="size" fill="#8b5cf6" name="Indexes" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Business metrics note */}
        <Alert variant="info" className="mt-3">
          <strong>Note:</strong> Business metrics (revenue, transactions, stock alerts, pending POs, deliveries) are available to users with business permissions (owner, sales staff, inventory staff, drivers).
        </Alert>
      </div>
    )
  }

  // ============================================================
  // OWNER DASHBOARD — Full business analytics with charts
  // ============================================================
  if (isOwner) {
    const paymentBreakdown = salesDash?.payment_method_breakdown || []
    const dailyTrend = salesDash?.daily_sales_trend || []
    const statusDist = salesDash?.payment_status_distribution || []

    return (
      <div>
        <h5 className="mb-4">Business Overview</h5>

        <Row className="g-3 mb-4">
          <Col md={3}><StatCard title="Today's Revenue" value={`KES ${(stats?.stats.today_revenue ?? 0).toLocaleString()}`} variant="success" loading={statsLoading} /></Col>
          <Col md={3}><StatCard title="Transactions Today" value={stats?.stats.today_transactions ?? 0} variant="primary" loading={statsLoading} /></Col>
          <Col md={3}><StatCard title="Stock Alerts" value={alertData?.alerts.length ?? 0} variant={alertData?.alerts.length > 0 ? 'warning' : 'success'} loading={alertsLoading} /></Col>
          <Col md={3}><StatCard title="Pending Approvals" value={stats?.stats.pending_pos ?? 0} variant="warning" loading={statsLoading} /></Col>
        </Row>

        {/* Revenue Trend */}
        {dailyTrend.length > 0 && (
          <Card className="mb-4 p-3">
            <Card.Title>Revenue Trend (Last 7 Days)</Card.Title>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `KES ${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => `KES ${v.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
                <Line type="monotone" dataKey="transactions" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Transactions" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Payment Method + Status */}
        <Row className="g-3 mb-4">
          <Col md={6}>
            <Card className="p-3">
              <Card.Title>Payment Methods</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentBreakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentBreakdown.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `KES ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="p-3">
              <Card.Title>Payment Status</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {alertData?.alerts.length > 0 && (
          <Alert variant="warning">
            <strong>Low Stock:</strong>{' '}
            {alertData.alerts.slice(0, 3).map(a => a.product_name).join(', ')}
            {alertData.alerts.length > 3 && ` and ${alertData.alerts.length - 3} more`}
          </Alert>
        )}
      </div>
    )
  }

  // ============================================================
  // SALES STAFF DASHBOARD — Sales performance with charts
  // ============================================================
  if (isSales) {
    const topProducts = salesDash?.top_products || []
    const recentTxns = salesDash?.recent_transactions || []
    const paymentBreakdown = salesDash?.payment_method_breakdown || []
    const dailyTrend = salesDash?.daily_sales_trend || []
    const statusDist = salesDash?.payment_status_distribution || []
    // Sales dashboard includes its own stats — don't rely on /bi/dashboard which requires report.view
    const salesStats = salesDash?.stats || {}

    const productChartData = topProducts.map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      quantity: p.total_qty,
      revenue: p.total_revenue,
    }))

    return (
      <div>
        <h5 className="mb-4">Sales Dashboard</h5>

        <Row className="g-3 mb-4">
          <Col md={4}><StatCard title="Today's Revenue" value={`KES ${(salesStats.today_revenue ?? 0).toLocaleString()}`} variant="success" loading={statsLoading} /></Col>
          <Col md={4}><StatCard title="Transactions Today" value={salesStats.today_transactions ?? 0} variant="primary" loading={statsLoading} /></Col>
          <Col md={4}><StatCard title="Stock Alerts" value={alertData?.alerts.length ?? 0} variant={alertData?.alerts.length > 0 ? 'warning' : 'success'} loading={alertsLoading} /></Col>
        </Row>

        {/* Daily Sales Trend */}
        {dailyTrend.length > 0 && (
          <Card className="mb-4 p-3">
            <Card.Title>Daily Sales Trend (Last 7 Days)</Card.Title>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `KES ${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => `KES ${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Top Products + Payment Methods */}
        <Row className="g-3 mb-4">
          <Col md={6}>
            <Card className="p-3">
              <Card.Title>Top Selling Products Today</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="p-3">
              <Card.Title>Payment Methods</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentBreakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentBreakdown.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `KES ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Recent Transactions */}
        <Card className="p-3">
          <Card.Title>Recent Transactions</Card.Title>
          <Table striped hover responsive size="sm">
            <thead>
              <tr><th>#</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {recentTxns.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No recent transactions</td></tr>}
              {recentTxns.map(txn => (
                <tr key={txn.transaction_id}>
                  <td>#{txn.transaction_id}</td>
                  <td>{txn.customer_name}</td>
                  <td>KES {parseFloat(txn.total_amount).toLocaleString()}</td>
                  <td><Badge bg="secondary">{txn.payment_method}</Badge></td>
                  <td><Badge bg={txn.payment_status === 'paid' ? 'success' : 'warning'}>{txn.payment_status}</Badge></td>
                  <td>{new Date(txn.transaction_date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {alertData?.alerts.length > 0 && (
          <Alert variant="warning" className="mt-3">
            <strong>Low Stock:</strong>{' '}
            {alertData.alerts.slice(0, 3).map(a => a.product_name).join(', ')}
            {alertData.alerts.length > 3 && ` and ${alertData.alerts.length - 3} more`}
          </Alert>
        )}
      </div>
    )
  }

  // ============================================================
  // INVENTORY STAFF DASHBOARD — Stock management with charts
  // ============================================================
  if (isInventory) {
    const alerts = inventoryDash?.alerts || []
    const movements = inventoryDash?.recent_movements || []
    const pendingInbound = inventoryDash?.pending_inbound || []
    const stockByCategory = inventoryDash?.stock_by_category || []
    const movementDist = inventoryDash?.movement_type_distribution || []
    const stockLevels = inventoryDash?.stock_level_distribution || []

    return (
      <div>
        <h5 className="mb-4">Inventory Dashboard</h5>

        <Row className="g-3 mb-4">
          <Col md={4}><StatCard title="Active Alerts" value={alerts.length} variant={alerts.length > 0 ? 'danger' : 'success'} /></Col>
          <Col md={4}><StatCard title="Pending Inbound" value={pendingInbound.length} variant={pendingInbound.length > 0 ? 'warning' : 'success'} /></Col>
          <Col md={4}><StatCard title="Recent Movements" value={movements.length} variant="info" /></Col>
        </Row>

        {/* Stock Level Distribution + Category Breakdown */}
        <Row className="g-3 mb-4">
          <Col md={4}>
            <Card className="p-3">
              <Card.Title>Stock Health</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={stockLevels} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stockLevels.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={STATUS_COLORS[entry.name.toLowerCase().replace(' ', '_')] || COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col md={8}>
            <Card className="p-3">
              <Card.Title>Stock by Category</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stockByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="products" fill="#3b82f6" name="Products" />
                  <Bar dataKey="total_stock" fill="#10b981" name="Total Stock" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Movement Type Distribution */}
        {movementDist.length > 0 && (
          <Card className="mb-4 p-3">
            <Card.Title>Movement Types (Last 30 Days)</Card.Title>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={movementDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Alerts Table */}
        {alerts.length > 0 && (
          <Card className="mb-4 p-3">
            <Card.Title className="text-danger">Stock Alerts</Card.Title>
            <Table striped hover responsive size="sm">
              <thead><tr><th>Product</th><th>Type</th><th>Current Stock</th><th>Threshold</th></tr></thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.alert_id}>
                    <td>{a.product_name}</td>
                    <td><Badge bg={a.alert_type === 'out_of_stock' ? 'danger' : 'warning'}>{a.alert_type}</Badge></td>
                    <td>{a.current_stock}</td>
                    <td>{a.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}

        {/* Recent Movements */}
        <Card className="p-3">
          <Card.Title>Recent Stock Movements</Card.Title>
          <Table striped hover responsive size="sm">
            <thead><tr><th>Product</th><th>Type</th><th>Change</th><th>Stock After</th><th>Notes</th><th>Date</th></tr></thead>
            <tbody>
              {movements.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No recent movements</td></tr>}
              {movements.map(m => (
                <tr key={m.movement_id}>
                  <td>{m.product_name}</td>
                  <td><Badge bg={m.movement_type === 'sale' ? 'primary' : m.movement_type === 'purchase' ? 'success' : 'secondary'}>{m.movement_type}</Badge></td>
                  <td className={m.quantity_change > 0 ? 'text-success' : 'text-danger'}>{m.quantity_change > 0 ? '+' : ''}{m.quantity_change}</td>
                  <td>{m.stock_after}</td>
                  <td>{m.notes || '—'}</td>
                  <td>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    )
  }

  // ============================================================
  // DRIVER DASHBOARD — Delivery management with charts
  // ============================================================
  if (isDriver) {
    const deliveries = driverDash?.deliveries || []
    const statusBreakdown = driverDash?.status_breakdown || {}
    const total = driverDash?.total || 0
    const weeklyTrend = driverDash?.weekly_trend || []
    const zoneDist = driverDash?.zone_distribution || []

    const pieData = Object.entries(statusBreakdown).map(([name, value]) => ({ name: name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), value }))

    return (
      <div>
        <h5 className="mb-4">My Deliveries</h5>

        <Row className="g-3 mb-4">
          <Col md={3}><StatCard title="Today's Deliveries" value={total} variant="primary" /></Col>
          <Col md={3}><StatCard title="Scheduled" value={statusBreakdown.scheduled || 0} variant="info" /></Col>
          <Col md={3}><StatCard title="In Transit" value={statusBreakdown.in_transit || 0} variant="warning" /></Col>
          <Col md={3}><StatCard title="Delivered" value={statusBreakdown.delivered || 0} variant="success" /></Col>
        </Row>

        {/* Weekly Trend + Zone Distribution */}
        <Row className="g-3 mb-4">
          <Col md={8}>
            <Card className="p-3">
              <Card.Title>Weekly Delivery Trend</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Total" />
                  <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Delivered" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="p-3">
              <Card.Title>Delivery Zones</Card.Title>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={zoneDist} dataKey="count" nameKey="zone" cx="50%" cy="50%" outerRadius={80} label={({ zone, percent }) => `${zone} ${(percent * 100).toFixed(0)}%`}>
                    {zoneDist.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Delivery List */}
        <Card className="p-3">
          <Card.Title>Today's Route</Card.Title>
          <Table striped hover responsive size="sm">
            <thead><tr><th>#</th><th>Customer</th><th>Zone</th><th>Phone</th><th>Scheduled</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {deliveries.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No deliveries assigned today</td></tr>}
              {deliveries.map(d => (
                <tr key={d.delivery_id}>
                  <td>#{d.delivery_id}</td>
                  <td>{d.customer_name}</td>
                  <td>{d.delivery_zone || '—'}</td>
                  <td>{d.customer_phone || '—'}</td>
                  <td>{new Date(d.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><Badge bg={d.status === 'delivered' ? 'success' : d.status === 'in_transit' ? 'warning' : 'primary'}>{d.status}</Badge></td>
                  <td>{d.delivery_notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    )
  }

  // ============================================================
  // FALLBACK — Minimal dashboard for unknown roles
  // ============================================================
  return (
    <div>
      <h5 className="mb-4">Dashboard</h5>
      <Row className="g-3 mb-4">
        {can('report.view') && (
          <Col md={3}><StatCard title="Today's Revenue" value={`KES ${(stats?.stats.today_revenue ?? 0).toLocaleString()}`} variant="success" loading={statsLoading} /></Col>
        )}
        {can('sale.view') && (
          <Col md={3}><StatCard title="Transactions Today" value={stats?.stats.today_transactions ?? 0} variant="primary" loading={statsLoading} /></Col>
        )}
        {can('inventory.view') && (
          <Col md={3}><StatCard title="Stock Alerts" value={alertData?.alerts.length ?? 0} variant={alertData?.alerts.length > 0 ? 'warning' : 'success'} loading={alertsLoading} /></Col>
        )}
      </Row>
      {alertData?.alerts.length > 0 && (
        <Alert variant="warning">
          <strong>Low Stock:</strong>{' '}
          {alertData.alerts.slice(0, 3).map(a => a.product_name).join(', ')}
        </Alert>
      )}
    </div>
  )
}
