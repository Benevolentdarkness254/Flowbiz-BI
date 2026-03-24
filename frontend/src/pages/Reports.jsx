// frontend/src/pages/Reports.jsx
import { useState }     from 'react'
import { Row, Col, Card, Spinner, Alert, Form, Button } from 'react-bootstrap'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { biApi }        from '../api/bi'

/**
 * BI Reports page — revenue chart over a date range.
 * Uses Recharts LineChart. Data comes from Flask's vw_revenue_summary view
 * which aggregates fact_daily_sales joined to dim_date.
 */
export default function Reports() {
  const today   = new Date().toISOString().split('T')[0]
  const thirty  = new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0]

  const [start,   setStart]   = useState(thirty)
  const [end,     setEnd]     = useState(today)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetch = () => {
    setLoading(true)
    biApi.getRevenue(start, end)
      .then(res  => setData(res.data.revenue))
      .catch(err => setError(err.response?.data?.error ?? 'Failed to load'))
      .finally(()  => setLoading(false))
  }

  // aggregate data by date for the chart
  const chartData = data ? Object.values(
    data.reduce((acc, row) => {
      const d = row.full_date
      if (!acc[d]) acc[d] = { date: d, revenue: 0, transactions: 0 }
      acc[d].revenue      += parseFloat(row.net_revenue || 0)
      acc[d].transactions += parseInt(row.transactions || 0)
      return acc
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date)) : []

  return (
    <div>
      <h5 className="mb-4">Revenue Reports</h5>

      {/* Date range picker */}
      <Row className="g-2 mb-4 align-items-end">
        <Col md={3}>
          <Form.Label>From</Form.Label>
          <Form.Control type="date" value={start} onChange={e => setStart(e.target.value)} />
        </Col>
        <Col md={3}>
          <Form.Label>To</Form.Label>
          <Form.Control type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </Col>
        <Col md={2}>
          <Button onClick={fetch} disabled={loading}>
            {loading ? 'Loading...' : 'Run Report'}
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      {chartData.length > 0 && (
        <Card className="p-3">
          <Card.Title>Net Revenue</Card.Title>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => `KES ${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke="#0d6efd" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}