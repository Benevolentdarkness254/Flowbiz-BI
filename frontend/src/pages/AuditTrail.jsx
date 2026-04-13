// frontend/src/pages/AuditTrail.jsx
// Audit trail viewer — shows system changes and login activity
import { useState, useMemo } from 'react'
import {
  Card, Table, Spinner, Alert, Form, Row, Col, Badge, Button,
  Tab, Tabs, InputGroup
} from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { systemApi } from '../api/system'

const ACTION_CONFIG = {
  create:  { label: 'Created',   bg: 'success', icon: '➕' },
  insert:  { label: 'Inserted',  bg: 'success', icon: '➕' },
  login:   { label: 'Logged In', bg: 'primary',  icon: '🔓' },
  logout:  { label: 'Logged Out', bg: 'secondary', icon: '🔒' },
  update:  { label: 'Updated',   bg: 'warning',  icon: '✏️' },
  adjust:  { label: 'Adjusted',  bg: 'warning',  icon: '🔧' },
  delete:  { label: 'Deleted',   bg: 'danger',   icon: '🗑️' },
  void:    { label: 'Voided',    bg: 'danger',   icon: '⛔' },
  approve: { label: 'Approved',  bg: 'success',  icon: '✅' },
  decline: { label: 'Declined',  bg: 'danger',   icon: '❌' },
  reject:  { label: 'Rejected',  bg: 'danger',   icon: '❌' },
}

function getActionInfo(action) {
  const a = action?.toLowerCase() || ''
  for (const [key, config] of Object.entries(ACTION_CONFIG)) {
    if (a.includes(key)) return config
  }
  return { label: action || 'Unknown', bg: 'secondary', icon: '📋' }
}

function formatDiff(oldValue, newValue) {
  if (!oldValue && !newValue) return null
  try {
    const old = typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue || {}
    const current = typeof newValue === 'string' ? JSON.parse(newValue) : newValue || {}
    const allKeys = new Set([...Object.keys(old), ...Object.keys(current)])
    const changes = []
    for (const key of allKeys) {
      const oldVal = old[key]
      const newVal = current[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key.replace(/_/g, ' '), from: oldVal ?? '—', to: newVal ?? '—' })
      }
    }
    return changes.length > 0 ? changes : null
  } catch {
    return null
  }
}

function DiffRow({ changes }) {
  if (!changes || changes.length === 0) return null
  return (
    <tr className="bg-light border-0">
      <td colSpan="5" className="p-0 border-0">
        <div className="px-4 py-2 bg-white border rounded-bottom mx-3 mb-2">
          <small className="text-muted fw-bold mb-1 d-block">Changes</small>
          <div className="d-flex flex-wrap gap-2">
            {changes.map((c, i) => (
              <span key={i} className="badge bg-secondary me-1">
                {c.field}: <span className="text-danger">{String(c.from)}</span>
                {' → '}
                <span className="text-success">{String(c.to)}</span>
              </span>
            ))}
          </div>
        </div>
      </td>
    </tr>
  )
}

function AuditLogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const info = getActionInfo(log.action)
  const changes = useMemo(() => formatDiff(log.old_value, log.new_value), [log])
  const table = log.table_name?.replace(/_/g, ' ') || 'record'

  return (
    <>
      <tr
        style={{ cursor: changes ? 'pointer' : 'default' }}
        onClick={() => changes && setExpanded(!expanded)}
        className={expanded ? 'table-active' : ''}
      >
        <td className="text-nowrap">
          <Badge bg={info.bg} className="me-2">{info.icon}</Badge>
          <span className="small">{info.label}</span>
        </td>
        <td className="small">{table}</td>
        <td className="small fw-medium">#{log.record_id || '—'}</td>
        <td className="small">{log.user_id ? `User ${log.user_id}` : 'System'}</td>
        <td className="small text-muted">{log.ip_address || '—'}</td>
        <td className="text-nowrap small text-end">
          {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
        </td>
      </tr>
      {changes && (
        <tr className={expanded ? '' : 'd-none'}>
          <td colSpan="6" className="p-0 border-0">
            <div className="px-4 py-2 bg-light border rounded mx-3 mb-2">
              <small className="text-muted fw-bold mb-1 d-block">Field Changes</small>
              <div className="d-flex flex-wrap gap-2">
                {changes.map((c, i) => (
                  <span key={i} className="badge bg-light text-dark border me-1 mb-1">
                    <span className="text-danger text-decoration-line-through me-1">{c.field}: {String(c.from)}</span>
                    <span className="text-success">→ {String(c.to)}</span>
                  </span>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditTrail() {
  const [activeTab, setActiveTab] = useState('changes')
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateRange, setDateRange] = useState('7d')

  const { data, loading, error } = useApi(
    () => systemApi.getAuditLogs({ table_name: tableFilter, action: actionFilter, per_page: 100 }),
    [tableFilter, actionFilter]
  )

  const { data: tablesData } = useApi(() => systemApi.getAuditTables(), [])

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return []
    const now = new Date()
    const cutoff = new Date(now - (
      dateRange === 'today' ? 86400000 :
      dateRange === '7d' ? 7 * 86400000 :
      dateRange === '30d' ? 30 * 86400000 :
      Infinity
    ))
    return data.logs.filter(log => !log.created_at || new Date(log.created_at) >= cutoff)
  }, [data?.logs, dateRange])

  const loginLogs = useMemo(() =>
    filteredLogs.filter(l => l.action?.toLowerCase().includes('login')),
    [filteredLogs]
  )

  const changeLogs = useMemo(() =>
    filteredLogs.filter(l => !l.action?.toLowerCase().includes('login')),
    [filteredLogs]
  )

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <h5 className="mb-4">Audit Trail</h5>

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="align-items-end g-3">
            <Col md={3}>
              <Form.Label className="small text-muted mb-1">Time Range</Form.Label>
              <Form.Select value={dateRange} onChange={e => setDateRange(e.target.value)} size="sm">
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small text-muted mb-1">Table</Form.Label>
              <Form.Select
                value={tableFilter}
                onChange={e => setTableFilter(e.target.value)}
                size="sm"
              >
                <option value="">All Tables</option>
                {tablesData?.tables?.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small text-muted mb-1">Action</Form.Label>
              <Form.Control
                placeholder="e.g. create, update, login"
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                size="sm"
              />
            </Col>
            <Col md={3} className="text-end">
              <small className="text-muted">
                {filteredLogs.length} events
              </small>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="changes" title={`System Changes (${changeLogs.length})`}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {changeLogs.length === 0 ? (
                <div className="text-center text-muted py-5">No activity records found</div>
              ) : (
                <Table hover responsive className="mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Action</th>
                      <th>Table</th>
                      <th>Record</th>
                      <th>User</th>
                      <th>IP Address</th>
                      <th className="text-end">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeLogs.map(log => (
                      <AuditLogRow key={log.log_id} log={log} />
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="logins" title={`Login Activity (${loginLogs.length})`}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {loginLogs.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No login events recorded. Login events will appear here once users log in.
                </div>
              ) : (
                <Table hover responsive className="mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Event</th>
                      <th>User</th>
                      <th>IP Address</th>
                      <th className="text-end">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.map(log => {
                      const info = getActionInfo(log.action)
                      return (
                        <tr key={log.log_id}>
                          <td>
                            <Badge bg={info.bg}>{info.icon} {info.label}</Badge>
                          </td>
                          <td className="fw-medium">User {log.user_id || 'Unknown'}</td>
                          <td className="text-muted">{log.ip_address || '—'}</td>
                          <td className="text-end text-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  )
}
