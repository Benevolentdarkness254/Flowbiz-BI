// frontend/src/pages/Reports.jsx
import { useState, useEffect } from 'react'
import { Row, Col, Card, Spinner, Alert, Form, Button, Table, Tabs, Tab, Badge, ProgressBar } from 'react-bootstrap'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { biApi } from '../api/bi'

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#0dcaf0']

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center justify-content-center rounded-circle"
             style={{ width: 48, height: 48, background: `${color}15`, color }}>
          {icon}
        </div>
        <div>
          <div className="text-muted small">{title}</div>
          <div className="fs-4 fw-bold mb-0">{value}</div>
          {subtitle && <div className="text-muted small">{subtitle}</div>}
        </div>
      </Card.Body>
    </Card>
  )
}

function LoadingCard() {
  return <Card className="border-0 shadow-sm p-4 text-center"><Spinner animation="border" size="sm" /> <span className="ms-2 text-muted small">Loading...</span></Card>
}

export default function Reports() {
  const today = new Date().toISOString().split('T')[0]
  const thirty = new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0]

  const [start, setStart] = useState(thirty)
  const [end, setEnd] = useState(today)
  const [activeTab, setActiveTab] = useState('overview')

  // Overview data
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(false)

  // Revenue data
  const [revenueData, setRevenueData] = useState(null)
  const [revenueLoading, setRevenueLoading] = useState(false)

  // Delivery data
  const [deliveryData, setDeliveryData] = useState(null)
  const [deliveryLoading, setDeliveryLoading] = useState(false)

  // PO data
  const [poData, setPOData] = useState(null)
  const [poLoading, setPOLoading] = useState(false)

  // HR data
  const [hrData, setHRData] = useState(null)
  const [hrLoading, setHRLoading] = useState(false)

  // Customer data
  const [customerData, setCustomerData] = useState(null)
  const [customerLoading, setCustomerLoading] = useState(false)

  // KRA data
  const [kraData, setKRAData] = useState(null)
  const [kraloading, setKRALoading] = useState(false)

  const fetchOverview = () => {
    setOverviewLoading(true)
    biApi.getOverview(start, end)
      .then(res => setOverview(res.data.data))
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false))
  }

  const fetchRevenue = () => {
    setRevenueLoading(true)
    biApi.getRevenue(start, end)
      .then(res => setRevenueData(res.data.revenue))
      .catch(() => setRevenueData(null))
      .finally(() => setRevenueLoading(false))
  }

  const fetchDeliveries = () => {
    setDeliveryLoading(true)
    biApi.getDeliveryAnalytics()
      .then(res => setDeliveryData(res.data.data))
      .catch(() => setDeliveryData(null))
      .finally(() => setDeliveryLoading(false))
  }

  const fetchPOs = () => {
    setPOLoading(true)
    biApi.getPOAnalytics()
      .then(res => setPOData(res.data.data))
      .catch(() => setPOData(null))
      .finally(() => setPOLoading(false))
  }

  const fetchHR = () => {
    setHRLoading(true)
    biApi.getHRAnalytics()
      .then(res => setHRData(res.data.data))
      .catch(() => setHRData(null))
      .finally(() => setHRLoading(false))
  }

  const fetchCustomers = () => {
    setCustomerLoading(true)
    biApi.getCustomers()
      .then(res => setCustomerData(res.data.customers))
      .catch(() => setCustomerData([]))
      .finally(() => setCustomerLoading(false))
  }

  const fetchKRA = () => {
    setKRALoading(true)
    biApi.getKRAQueue()
      .then(res => setKRAData(res.data.queue))
      .catch(() => setKRAData([]))
      .finally(() => setKRALoading(false))
  }

  // Auto-fetch on tab enter
  useEffect(() => {
    if (activeTab === 'overview') fetchOverview()
    if (activeTab === 'revenue') fetchRevenue()
    if (activeTab === 'deliveries') fetchDeliveries()
    if (activeTab === 'purchase-orders') fetchPOs()
    if (activeTab === 'hr') fetchHR()
    if (activeTab === 'customers') fetchCustomers()
    if (activeTab === 'kra') fetchKRA()
  }, [activeTab])

  // Derived chart data
  const chartData = revenueData ? Object.values(
    revenueData.reduce((acc, row) => {
      const d = row.full_date
      if (!acc[d]) acc[d] = { date: d, revenue: 0, transactions: 0, units: 0 }
      acc[d].revenue += parseFloat(row.net_revenue || 0)
      acc[d].transactions += parseInt(row.transactions || 0)
      acc[d].units += parseInt(row.total_units || 0)
      return acc
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date)) : []

  const categoryData = revenueData ? Object.values(
    revenueData.reduce((acc, row) => {
      const cat = row.product_category || 'Unknown'
      if (!acc[cat]) acc[cat] = { category: cat, revenue: 0, units: 0 }
      acc[cat].revenue += parseFloat(row.net_revenue || 0)
      acc[cat].units += parseInt(row.total_units || 0)
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue) : []

  const fmt = (v) => `KES ${Number(v || 0).toLocaleString()}`

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Reports & Analytics</h5>
        <div className="d-flex gap-2 align-items-end">
          <div>
            <Form.Label className="small mb-1 text-muted">From</Form.Label>
            <Form.Control type="date" size="sm" value={start} onChange={e => setStart(e.target.value)} style={{ width: 150 }} />
          </div>
          <div>
            <Form.Label className="small mb-1 text-muted">To</Form.Label>
            <Form.Control type="date" size="sm" value={end} onChange={e => setEnd(e.target.value)} style={{ width: 150 }} />
          </div>
        </div>
      </div>

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-4">
        {/* ==================== OVERVIEW ==================== */}
        <Tab eventKey="overview" title="Overview">
          {overviewLoading && <LoadingCard />}

          {overview && !overviewLoading && overview.sales && (
            <>
              {/* KPI Cards */}
              <Row className="g-3 mb-4">
                <Col md={3}>
                  <StatCard title="Total Revenue" value={fmt(overview.sales.total_revenue)}
                    subtitle={`${overview.sales.total_transactions} transactions`}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>}
                    color="#0d6efd" />
                </Col>
                <Col md={3}>
                  <StatCard title="Collected" value={fmt(overview.sales.collected)}
                    subtitle={`Pending: ${fmt(overview.sales.pending)}`}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
                    color="#198754" />
                </Col>
                <Col md={3}>
                  <StatCard title="Inventory Value" value={fmt(overview.inventory.total_value)}
                    subtitle={`${overview.inventory.low_stock} low, ${overview.inventory.out_of_stock} out of stock`}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
                    color="#ffc107" />
                </Col>
                <Col md={3}>
                  <StatCard title="Active Users" value={overview.users}
                    subtitle={`${Object.values(overview.deliveries).reduce((a, b) => a + b, 0)} total deliveries`}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
                    color="#6f42c1" />
                </Col>
              </Row>

              {/* Payment Methods + Top Products */}
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Payment Methods</Card.Title>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={overview.sales.payment_methods} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {overview.sales.payment_methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Top Products by Revenue</Card.Title>
                      {overview.sales.top_products.map((p, i) => (
                        <div key={i} className="mb-2">
                          <div className="d-flex justify-content-between small">
                            <span>{p.name}</span>
                            <span className="fw-bold">{fmt(p.revenue)}</span>
                          </div>
                          <ProgressBar now={overview.sales.top_products[0]?.revenue ? (p.revenue / overview.sales.top_products[0].revenue * 100) : 0} variant={COLORS[i % COLORS.length]} style={{ height: 6 }} />
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Top Customers</Card.Title>
                      <Table size="sm" className="mb-0">
                        <thead><tr><th>Customer</th><th>Type</th><th>Spent</th></tr></thead>
                        <tbody>
                          {overview.sales.top_customers.slice(0, 8).map((c, i) => (
                            <tr key={i}>
                              <td className="small">{c.customer_name}</td>
                              <td><Badge bg="light text-dark">{c.customer_type?.replace('_', ' ')}</Badge></td>
                              <td className="small fw-bold">{fmt(c.total_spent)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Delivery + PO + Receipts Summary */}
              <Row className="g-3">
                <Col md={4}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Delivery Status</Card.Title>
                      {Object.entries(overview.deliveries).map(([status, count]) => (
                        <div key={status} className="d-flex justify-content-between small mb-1">
                          <span className="text-capitalize">{status.replace('_', ' ')}</span>
                          <Badge bg={status === 'delivered' ? 'success' : status === 'in_transit' ? 'primary' : status === 'scheduled' ? 'info' : 'danger'}>{count}</Badge>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Purchase Order Pipeline</Card.Title>
                      {Object.entries(overview.purchase_orders).map(([status, data]) => (
                        <div key={status} className="mb-2">
                          <div className="d-flex justify-content-between small">
                            <span className="text-capitalize">{status.replace('_', ' ')}</span>
                            <span className="fw-bold">{fmt(data.total_value)}</span>
                          </div>
                          <div className="text-muted small">{data.count} order(s)</div>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Receipts Summary</Card.Title>
                      {Object.entries(overview.receipts).map(([type, data]) => (
                        <div key={type} className="mb-2">
                          <div className="d-flex justify-content-between small">
                            <span className="text-capitalize">{type}</span>
                            <span className="fw-bold">{fmt(data.total)}</span>
                          </div>
                          <div className="text-muted small">{data.count} receipt(s)</div>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          )}
          {!overviewLoading && !overview && (
            <Alert variant="info">Click "Run Report" or select a date range to load business overview.</Alert>
          )}
        </Tab>

        {/* ==================== REVENUE ==================== */}
        <Tab eventKey="revenue" title="Revenue">
          <div className="mb-4">
            <Button onClick={fetchRevenue} disabled={revenueLoading} size="sm">
              {revenueLoading ? <><Spinner animation="border" size="sm" className="me-2" />Loading...</> : 'Run Report'}
            </Button>
          </div>

          {chartData.length > 0 && (
            <Row className="g-3">
              <Col md={8}>
                <Card className="border-0 shadow-sm p-3">
                  <Card.Title className="fs-6">Net Revenue Over Time</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmt(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="#0d6efd" fill="#0d6efd20" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-0 shadow-sm p-3">
                  <Card.Title className="fs-6">Revenue by Category</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => fmt(v)} />
                      <Bar dataKey="revenue" fill="#198754" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          )}
          {chartData.length === 0 && !revenueLoading && <Alert variant="info">Click "Run Report" to view revenue data.</Alert>}
        </Tab>

        {/* ==================== DELIVERIES ==================== */}
        <Tab eventKey="deliveries" title="Deliveries">
          {deliveryLoading && <LoadingCard />}
          {deliveryData && !deliveryLoading && (
            <>
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Driver Performance</Card.Title>
                      <Table size="sm" responsive>
                        <thead><tr><th>Driver</th><th>Total</th><th>Delivered</th><th>Pending</th><th>Failed</th></tr></thead>
                        <tbody>
                          {deliveryData.driver_performance.map((d, i) => (
                            <tr key={i}>
                              <td className="fw-bold small">{d.driver_name}</td>
                              <td>{d.total_deliveries}</td>
                              <td><Badge bg="success">{d.delivered}</Badge></td>
                              <td><Badge bg="warning">{d.pending}</Badge></td>
                              <td><Badge bg="danger">{d.failed}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Zone Performance</Card.Title>
                      {deliveryData.zone_stats.map((z, i) => (
                        <div key={i} className="mb-2">
                          <div className="d-flex justify-content-between small">
                            <span>{z.delivery_zone || 'Unassigned'}</span>
                            <span>{z.delivered}/{z.total} delivered</span>
                          </div>
                          <ProgressBar now={z.total ? (z.delivered / z.total * 100) : 0} variant="success" style={{ height: 6 }} />
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <Card.Title className="fs-6">Delivery Log (Recent 20)</Card.Title>
                  <Table size="sm" responsive striped hover>
                    <thead><tr><th>ID</th><th>Customer</th><th>Driver</th><th>Zone</th><th>Status</th><th>Scheduled</th><th>Delivered</th><th>Notes</th></tr></thead>
                    <tbody>
                      {deliveryData.recent_deliveries.map((d) => (
                        <tr key={d.delivery_id}>
                          <td><code>{d.delivery_id}</code></td>
                          <td className="small">{d.customer_name}</td>
                          <td className="small">{d.driver_name}</td>
                          <td className="small">{d.delivery_zone || '—'}</td>
                          <td><Badge bg={d.status === 'delivered' ? 'success' : d.status === 'in_transit' ? 'primary' : d.status === 'scheduled' ? 'info' : 'danger'}>{d.status}</Badge></td>
                          <td className="small">{d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString() : '—'}</td>
                          <td className="small">{d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : '—'}</td>
                          <td className="small text-muted">{d.delivery_notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </>
          )}
        </Tab>

        {/* ==================== PURCHASE ORDERS ==================== */}
        <Tab eventKey="purchase-orders" title="Purchase Orders">
          {poLoading && <LoadingCard />}
          {poData && !poLoading && (
            <>
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">PO Pipeline</Card.Title>
                      {Object.entries(poData.pipeline).map(([status, data]) => (
                        <div key={status} className="mb-3">
                          <div className="d-flex justify-content-between small">
                            <span className="text-capitalize fw-bold">{status.replace('_', ' ')}</span>
                            <span>{data.count} orders — {fmt(data.total_value)}</span>
                          </div>
                          <ProgressBar now={Object.values(poData.pipeline).reduce((a, b) => a + b.count, 0) ? (data.count / Object.values(poData.pipeline).reduce((a, b) => a + b.count, 0) * 100) : 0}
                            variant={status === 'received' ? 'success' : status === 'approved' ? 'primary' : status === 'pending_approval' ? 'warning' : status === 'declined' ? 'danger' : 'secondary'} style={{ height: 8 }} />
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Supplier Performance</Card.Title>
                      <Table size="sm" responsive>
                        <thead><tr><th>Supplier</th><th>Orders</th><th>Value</th><th>Received</th><th>Approved</th><th>Declined</th></tr></thead>
                        <tbody>
                          {poData.supplier_performance.map((s, i) => (
                            <tr key={i}>
                              <td className="small fw-bold">{s.supplier_name}</td>
                              <td>{s.total_orders}</td>
                              <td className="small">{fmt(s.total_value)}</td>
                              <td><Badge bg="success">{s.received}</Badge></td>
                              <td><Badge bg="primary">{s.approved}</Badge></td>
                              <td><Badge bg="danger">{s.declined}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <Card.Title className="fs-6">Recent Orders</Card.Title>
                  <Table size="sm" responsive striped hover>
                    <thead><tr><th>PO #</th><th>Supplier</th><th>Requested By</th><th>Order Date</th><th>Expected</th><th>Amount</th><th>Status</th><th>Reason</th></tr></thead>
                    <tbody>
                      {poData.recent_orders.map((po) => (
                        <tr key={po.purchase_order_id}>
                          <td><code>{po.purchase_order_id}</code></td>
                          <td className="small">{po.supplier_name}</td>
                          <td className="small">{po.requested_by}</td>
                          <td className="small">{po.order_date ? new Date(po.order_date).toLocaleDateString() : '—'}</td>
                          <td className="small">{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '—'}</td>
                          <td className="small fw-bold">{fmt(po.total_amount)}</td>
                          <td><Badge bg={po.status === 'received' ? 'success' : po.status === 'approved' ? 'primary' : po.status === 'pending_approval' ? 'warning' : po.status === 'declined' ? 'danger' : 'secondary'}>{po.status}</Badge></td>
                          <td className="small text-muted">{po.rejection_reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </>
          )}
        </Tab>

        {/* ==================== HR ==================== */}
        <Tab eventKey="hr" title="Team & HR">
          {hrLoading && <LoadingCard />}
          {hrData && !hrLoading && (
            <>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Team by Role</Card.Title>
                      {hrData.role_distribution.map((r, i) => (
                        <div key={i} className="d-flex justify-content-between small mb-2">
                          <span className="text-capitalize">{r.role_name.replace('_', ' ')}</span>
                          <Badge bg={COLORS[i % COLORS.length]}>{r.count}</Badge>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={8}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Card.Title className="fs-6">Sales Staff Performance (Last 30 Days)</Card.Title>
                      <Table size="sm" responsive>
                        <thead><tr><th>Name</th><th>Sales</th><th>Revenue</th><th>Active Days</th></tr></thead>
                        <tbody>
                          {hrData.staff_performance.map((s, i) => (
                            <tr key={i}>
                              <td className="small fw-bold">{s.full_name}</td>
                              <td>{s.total_sales}</td>
                              <td className="fw-bold">{fmt(s.total_revenue)}</td>
                              <td>{s.active_days}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <Card.Title className="fs-6">Recent User Activity</Card.Title>
                  <Table size="sm" responsive striped hover>
                    <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last Login</th><th>Status</th></tr></thead>
                    <tbody>
                      {hrData.recent_logins.map((u, i) => (
                        <tr key={i}>
                          <td className="small fw-bold">{u.full_name}</td>
                          <td className="small"><code>{u.username}</code></td>
                          <td><Badge bg="light text-dark">{u.role_name?.replace('_', ' ')}</Badge></td>
                          <td className="small">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                          <td><Badge bg={u.is_active ? 'success' : 'danger'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </>
          )}
        </Tab>

        {/* ==================== CUSTOMERS ==================== */}
        <Tab eventKey="customers" title="Customers">
          {customerLoading && <LoadingCard />}
          {customerData && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <Card.Title className="fs-6">Customer Lifetime Value</Card.Title>
                <Table size="sm" responsive striped hover>
                  <thead><tr><th>Customer</th><th>Type</th><th>Zone</th><th>Transactions</th><th>Lifetime Value</th><th>Avg Basket</th><th>Last Purchase</th></tr></thead>
                  <tbody>
                    {customerData.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No customer data</td></tr>}
                    {customerData.map(c => (
                      <tr key={c.customer_id}>
                        <td className="small fw-bold">{c.customer_name}</td>
                        <td><Badge bg="secondary">{c.customer_type?.replace('_', ' ')}</Badge></td>
                        <td className="small">{c.zone || '—'}</td>
                        <td>{c.total_transactions || 0}</td>
                        <td className="fw-bold">{fmt(c.lifetime_value)}</td>
                        <td className="small">{fmt(c.avg_basket_size)}</td>
                        <td className="small">{c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Tab>

        {/* ==================== KRA QUEUE ==================== */}
        <Tab eventKey="kra" title="KRA Queue">
          {kraloading && <LoadingCard />}
          {kraData && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <Card.Title className="fs-6">Invoices Pending KRA eTIMS Submission</Card.Title>
                <Table size="sm" responsive striped hover>
                  <thead><tr><th>Invoice #</th><th>Type</th><th>Date</th><th>Customer</th><th>Amount</th><th>Tax</th><th>Status</th><th>Error</th></tr></thead>
                  <tbody>
                    {kraData.length === 0 && <tr><td colSpan="8" className="text-center text-muted">All invoices submitted successfully</td></tr>}
                    {kraData.map(inv => (
                      <tr key={inv.invoice_id}>
                        <td><code>{inv.invoice_number}</code></td>
                        <td className="small">{inv.invoice_type}</td>
                        <td className="small">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                        <td className="small">{inv.customer_name}</td>
                        <td className="small fw-bold">{fmt(inv.total_amount)}</td>
                        <td className="small">{fmt(inv.tax_amount)}</td>
                        <td><Badge bg={inv.kra_status === 'rejected' ? 'danger' : 'warning'}>{inv.kra_status}</Badge></td>
                        <td className="small text-danger">{inv.kra_error_log || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Tab>
      </Tabs>
    </div>
  )
}