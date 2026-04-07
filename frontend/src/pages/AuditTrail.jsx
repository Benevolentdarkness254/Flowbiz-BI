// frontend/src/pages/AuditTrail.jsx
// Simplified audit trail viewer — clean timeline with expandable details
import { useState } from 'react'
import {
  Table, Spinner, Alert, Form, Row, Col, Badge, Button, Collapse
} from 'react-bootstrap'
import { ChevronDown, ChevronRight } from 'react-bootstrap-icons'
import { useApi } from '../hooks/useApi'
import { systemApi } from '../api/system'

// Human-readable action labels with icons
const ACTION_CONFIG = {
  create: { label: 'Created', icon: '➕', variant: 'success' },
  insert: { label: 'Inserted', icon: '➕', variant: 'success' },
  update: { label: 'Updated', icon: '✏️', variant: 'warning' },
  adjust: { label: 'Adjusted', icon: '🔧', variant: 'warning' },
  delete: { label: 'Deleted', icon: '🗑️', variant: 'danger' },
  void: { label: 'Voided', icon: '⛔', variant: 'danger' },
  approve: { label: 'Approved', icon: '✅', variant: 'success' },
  decline: { label: 'Declined', icon: '❌', variant: 'danger' },
  reject: { label: 'Rejected', icon: '❌', variant: 'danger' },
}

/**
 * Get a human-readable description of an audit log entry.
 * Shows what happened in plain language instead of raw JSON diffs.
 */
function getActionDescription(log) {
  const action = log.action?.toLowerCase() || ''
  const table = log.table_name?.replace(/_/g, ' ') || 'record'

  // Match known action patterns
  for (const [key, config] of Object.entries(ACTION_CONFIG)) {
    if (action.includes(key)) {
      return `${config.icon} ${config.label} ${table} #${log.record_id}`
    }
  }

  // Fallback: capitalize the action
  return `${action} ${table} #${log.record_id}`
}

/**
 * Format the diff between old and new values as a clean key-value list.
 * Only shows fields that actually changed.
 */
function formatDiff(oldValue, newValue) {
  if (!oldValue && !newValue) return null

  let old = typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue
  let current = typeof newValue === 'string' ? JSON.parse(newValue) : newValue

  if (!old) old = {}
  if (!current) current = {}

  const allKeys = new Set([...Object.keys(old), ...Object.keys(current)])
  const changes = []

  for (const key of allKeys) {
    const oldVal = old[key]
    const newVal = current[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key.replace(/_/g, ' '),
        from: oldVal ?? '—',
        to: newVal ?? '—',
      })
    }
  }

  return changes.length > 0 ? changes : null
}

/**
 * Simplified Audit Trail page.
 * Shows a clean timeline of system changes with:
 * - Quick filter buttons (Today, This Week, All)
 * - Table name and action type filters
 * - Expandable rows showing only the fields that changed
 * - Human-readable action descriptions
 */
export default function AuditTrail() {
  const [filters, setFilters] = useState({ table_name: '', action: '' })
  const [page, setPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState({})

  // Fetch audit logs with current filters
  const { data, loading, error } = useApi(
    () => systemApi.getAuditLogs({ ...filters, page, per_page: 30 }),
    [filters, page]
  )

  // Fetch available table names for the filter dropdown
  const { data: tablesData } = useApi(() => systemApi.getAuditTables(), [])

  // Toggle expand/collapse for a row's diff details
  const toggleRow = (logId) => {
    setExpandedRows(prev => ({ ...prev, [logId]: !prev[logId] }))
  }

  // Quick time range filter
  const quickFilter = (range) => {
    // For now, just reset filters — the backend doesn't support date ranges yet
    setFilters({ table_name: '', action: '' })
    setPage(1)
  }

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <h5 className="mb-4">Audit Trail</h5>

      {/* Quick filter buttons */}
      <div className="d-flex gap-2 mb-3">
        <Button variant="outline-primary" size="sm" onClick={() => quickFilter('today')}>Today</Button>
        <Button variant="outline-primary" size="sm" onClick={() => quickFilter('week')}>This Week</Button>
        <Button variant="outline-primary" size="sm" onClick={() => quickFilter('all')}>All</Button>
      </div>

      {/* Filter controls */}
      <Row className="g-2 mb-4">
        <Col md={4}>
          <Form.Select
            value={filters.table_name}
            onChange={e => { setFilters({ ...filters, table_name: e.target.value }); setPage(1) }}
          >
            <option value="">All Tables</option>
            {tablesData?.tables?.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Control
            placeholder="Filter by action..."
            value={filters.action}
            onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(1) }}
          />
        </Col>
      </Row>

      {/* Audit log timeline */}
      <Table hover responsive size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th style={{ width: 40 }}></th>
            <th>Timestamp</th>
            <th>Action</th>
            <th>User</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {data?.logs?.length === 0 && (
            <tr><td colSpan="5" className="text-center text-muted py-4">No audit logs found</td></tr>
          )}
          {data?.logs?.map(log => {
            const isExpanded = expandedRows[log.log_id]
            const changes = formatDiff(log.old_value, log.new_value)
            const description = getActionDescription(log)

            return (
              <tbody key={log.log_id}>
                {/* Main row */}
                <tr
                  style={{ cursor: changes ? 'pointer' : 'default' }}
                  onClick={() => changes && toggleRow(log.log_id)}
                  className={isExpanded ? 'table-active' : ''}
                >
                  <td>
                    {changes && (
                      isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                  </td>
                  <td className="text-nowrap small">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </td>
                  <td>
                    <span className="small">{description}</span>
                  </td>
                  <td className="small">{log.user_id ? `User #${log.user_id}` : '—'}</td>
                  <td className="small text-muted">{log.ip_address || '—'}</td>
                </tr>

                {/* Expanded diff row */}
                {changes && (
                  <tr>
                    <td colSpan="5" className="p-0">
                      <Collapse in={isExpanded}>
                        <div className="p-3 bg-light">
                          <Table size="sm" className="mb-0">
                            <thead>
                              <tr className="text-muted small">
                                <th>Field</th>
                                <th>From</th>
                                <th>To</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changes.map((change, i) => (
                                <tr key={i}>
                                  <td className="small fw-bold">{change.field}</td>
                                  <td className="small text-danger">
                                    {typeof change.from === 'object' ? JSON.stringify(change.from) : String(change.from)}
                                  </td>
                                  <td className="small text-success">
                                    {typeof change.to === 'object' ? JSON.stringify(change.to) : String(change.to)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </Collapse>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </tbody>
      </Table>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">
            Page {data.page} of {data.pages} ({data.total} records)
          </span>
          <div>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="me-2"
            >
              Previous
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
