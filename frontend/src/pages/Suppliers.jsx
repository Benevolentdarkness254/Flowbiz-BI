// frontend/src/pages/Suppliers.jsx
// Supplier management with full CRUD, approval workflow, and performance analytics
import { useState } from 'react'
import {
  Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col,
  Tabs, Tab, Card
} from 'react-bootstrap'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import { usePermission } from '../hooks/usePermission'
import { suppliersApi } from '../api/suppliers'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

/**
 * Suppliers page — full CRUD with approval workflow.
 * Inventory staff can create/edit supplier applications.
 * Business owners can approve/reject/suspend suppliers.
 * All users can view supplier details, contracts, and performance.
 */
export default function Suppliers() {
  const { can } = usePermission()

  // Fetch suppliers with optional filter
  const [filterStatus, setFilterStatus] = useState('')
  const { data, loading, error, refetch } = useApi(
    () => suppliersApi.getSuppliers(filterStatus ? { approval_status: filterStatus } : {}),
    [filterStatus]
  )

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [formData, setFormData] = useState({
    name: '', supplier_type: 'raw_water', kra_pin: '', payment_terms: 30,
    address: '', contract_start: '', contract_end: '', goods_dealt_with: '', notes: '',
    contacts: [{ contact_name: '', role: '', phone: '', email: '', is_primary: true }],
  })

  // Performance modal state
  const [showPerfModal, setShowPerfModal] = useState(false)
  const [perfData, setPerfData] = useState(null)
  const [perfLoading, setPerfLoading] = useState(false)

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState('approve')
  const [approvalReason, setApprovalReason] = useState('')
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)

  // Open create modal
  const openCreate = () => {
    setEditingSupplier(null)
    setFormData({
      name: '', supplier_type: 'raw_water', kra_pin: '', payment_terms: 30,
      address: '', contract_start: '', contract_end: '', goods_dealt_with: '', notes: '',
      contacts: [{ contact_name: '', role: '', phone: '', email: '', is_primary: true }],
    })
    setSubmitError(null)
    setShowModal(true)
  }

  // Open edit modal
  const openEdit = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      supplier_type: supplier.supplier_type,
      kra_pin: supplier.kra_pin || '',
      payment_terms: supplier.payment_terms || 30,
      address: supplier.address || '',
      contract_start: supplier.contract_start || '',
      contract_end: supplier.contract_end || '',
      goods_dealt_with: supplier.goods_dealt_with || '',
      notes: supplier.notes || '',
      contacts: supplier.contacts?.length > 0 ? supplier.contacts : [{ contact_name: '', role: '', phone: '', email: '', is_primary: true }],
    })
    setSubmitError(null)
    setShowModal(true)
  }

  // Add contact row
  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { contact_name: '', role: '', phone: '', email: '', is_primary: false }],
    }))
  }

  // Remove contact row
  const removeContact = (index) => {
    if (formData.contacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index),
      }))
    }
  }

  // Update contact field
  const updateContact = (index, field, value) => {
    const updated = [...formData.contacts]
    updated[index][field] = value
    if (field === 'is_primary' && value) {
      updated.forEach((c, i) => { if (i !== index) c.is_primary = false })
    }
    setFormData(prev => ({ ...prev, contacts: updated }))
  }

  // Submit create or update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    if (!formData.name) {
      setSubmitError('Supplier name is required')
      setSubmitting(false)
      return
    }

    try {
      if (editingSupplier) {
        await suppliersApi.updateSupplier(editingSupplier.supplier_id, formData)
      } else {
        await suppliersApi.createSupplier(formData)
      }
      setShowModal(false)
      refetch()
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to save supplier')
    } finally {
      setSubmitting(false)
    }
  }

  // Open approval modal
  const openApproval = (supplier, action) => {
    setSelectedSupplier(supplier)
    setApprovalAction(action)
    setApprovalReason('')
    setShowApprovalModal(true)
  }

  // Execute approval/rejection
  const executeApproval = async () => {
    if (!selectedSupplier) return
    if (approvalAction === 'reject' && !approvalReason) return
    setApprovalLoading(true)

    try {
      if (approvalAction === 'approve') {
        await suppliersApi.approveSupplier(selectedSupplier.supplier_id)
      } else if (approvalAction === 'reject') {
        await suppliersApi.rejectSupplier(selectedSupplier.supplier_id, approvalReason)
      } else if (approvalAction === 'suspend') {
        await suppliersApi.suspendSupplier(selectedSupplier.supplier_id)
      } else if (approvalAction === 'reinstate') {
        await suppliersApi.reinstateSupplier(selectedSupplier.supplier_id)
      }
      setShowApprovalModal(false)
      refetch()
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${approvalAction} supplier`)
    } finally {
      setApprovalLoading(false)
    }
  }

  // View supplier performance
  const viewPerformance = async (supplier) => {
    setPerfData(null)
    setPerfLoading(true)
    setShowPerfModal(true)
    try {
      const res = await suppliersApi.getPerformance(supplier.supplier_id)
      setPerfData(res.data)
    } catch {
      setPerfData(null)
    } finally {
      setPerfLoading(false)
    }
  }

  // Status badge color
  const statusBadge = (status) => {
    const map = { pending: 'warning', approved: 'success', rejected: 'danger', suspended: 'secondary' }
    return map[status] || 'secondary'
  }

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Suppliers</h5>
        <div className="d-flex gap-2">
          <Form.Select style={{ width: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </Form.Select>
          {can('po.create') && (
            <Button variant="primary" size="sm" onClick={openCreate}>New Supplier</Button>
          )}
        </div>
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Type</th>
            <th>Contact</th>
            <th>Contract Period</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.suppliers?.length === 0 && (
            <tr><td colSpan="7" className="text-center text-muted">No suppliers found</td></tr>
          )}
          {data?.suppliers?.map(s => (
            <tr key={s.supplier_id}>
              <td>{s.supplier_id}</td>
              <td><strong>{s.name}</strong></td>
              <td><Badge bg="info">{s.supplier_type?.replace('_', ' ')}</Badge></td>
              <td>
                {s.primary_contact ? (
                  <small>{s.primary_contact.name}<br/>{s.primary_contact.phone}</small>
                ) : '—'}
              </td>
              <td>
                {s.contract_start && s.contract_end ? (
                  <small>{new Date(s.contract_start).toLocaleDateString()} → {new Date(s.contract_end).toLocaleDateString()}</small>
                ) : '—'}
              </td>
              <td><Badge bg={statusBadge(s.approval_status)}>{s.approval_status}</Badge></td>
              <td>
                <div className="btn-group btn-group-sm">
                  <Button variant="outline-info" size="sm" onClick={() => viewPerformance(s)}>Details</Button>
                  {can('po.create') && (
                    <Button variant="outline-primary" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                  )}
                  {can('po.approve') && s.approval_status === 'pending' && (
                    <>
                      <Button variant="outline-success" size="sm" onClick={() => openApproval(s, 'approve')}>Approve</Button>
                      <Button variant="outline-danger" size="sm" onClick={() => openApproval(s, 'reject')}>Reject</Button>
                    </>
                  )}
                  {can('po.approve') && s.approval_status === 'approved' && (
                    <Button variant="outline-warning" size="sm" onClick={() => openApproval(s, 'suspend')}>Suspend</Button>
                  )}
                  {can('po.approve') && s.approval_status === 'suspended' && (
                    <Button variant="outline-success" size="sm" onClick={() => openApproval(s, 'reinstate')}>Reinstate</Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ============================================================ */}
      {/* CREATE / EDIT SUPPLIER MODAL */}
      {/* ============================================================ */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{editingSupplier ? 'Edit Supplier' : 'New Supplier Application'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {submitError && <Alert variant="danger">{submitError}</Alert>}
          <Form id="supplier-form" onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Name *</Form.Label>
                  <Form.Control required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Supplier Type *</Form.Label>
                  <Form.Select required value={formData.supplier_type} onChange={e => setFormData({...formData, supplier_type: e.target.value})}>
                    <option value="raw_water">Raw Water</option>
                    <option value="packaging">Packaging</option>
                    <option value="equipment">Equipment</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Group><Form.Label>KRA PIN</Form.Label>
                  <Form.Control value={formData.kra_pin} onChange={e => setFormData({...formData, kra_pin: e.target.value})} /></Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group><Form.Label>Payment Terms (days)</Form.Label>
                  <Form.Control type="number" value={formData.payment_terms} onChange={e => setFormData({...formData, payment_terms: parseInt(e.target.value) || 30})} /></Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group><Form.Label>Address</Form.Label>
                  <Form.Control value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Group><Form.Label>Contract Start</Form.Label>
                  <Form.Control type="date" value={formData.contract_start} onChange={e => setFormData({...formData, contract_start: e.target.value})} /></Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group><Form.Label>Contract End</Form.Label>
                  <Form.Control type="date" value={formData.contract_end} onChange={e => setFormData({...formData, contract_end: e.target.value})} /></Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group><Form.Label>Goods Dealt With</Form.Label>
                  <Form.Control value={formData.goods_dealt_with} onChange={e => setFormData({...formData, goods_dealt_with: e.target.value})} placeholder="e.g. 5L bottles, caps, labels" /></Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </Form.Group>

            <Form.Label>Contacts</Form.Label>
            {formData.contacts.map((c, i) => (
              <Card key={i} className="mb-2">
                <Card.Body className="py-2">
                  <Row className="g-2">
                    <Col md={3}>
                      <Form.Control placeholder="Name" value={c.contact_name} onChange={e => updateContact(i, 'contact_name', e.target.value)} />
                    </Col>
                    <Col md={2}>
                      <Form.Control placeholder="Role" value={c.role} onChange={e => updateContact(i, 'role', e.target.value)} />
                    </Col>
                    <Col md={2}>
                      <Form.Control placeholder="Phone" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                    </Col>
                    <Col md={2}>
                      <Form.Control placeholder="Email" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                    </Col>
                    <Col md={2} className="d-flex align-items-center">
                      <Form.Check type="checkbox" label="Primary" checked={c.is_primary} onChange={e => updateContact(i, 'is_primary', e.target.checked)} />
                    </Col>
                    <Col md={1}>
                      {formData.contacts.length > 1 && (
                        <Button variant="outline-danger" size="sm" onClick={() => removeContact(i)}>×</Button>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
            <Button variant="outline-secondary" size="sm" onClick={addContact}>+ Add Contact</Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" form="supplier-form" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : editingSupplier ? 'Update' : 'Submit for Approval'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================ */}
      {/* APPROVAL / REJECTION MODAL */}
      {/* ============================================================ */}
      <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {approvalAction === 'approve' ? 'Approve Supplier' :
             approvalAction === 'reject' ? 'Reject Supplier' :
             approvalAction === 'suspend' ? 'Suspend Supplier' : 'Reinstate Supplier'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to {approvalAction} <strong>{selectedSupplier?.name}</strong>?</p>
          {approvalAction === 'reject' && (
            <Form.Group>
              <Form.Label>Reason *</Form.Label>
              <Form.Control as="textarea" rows={3} required value={approvalReason} onChange={e => setApprovalReason(e.target.value)} />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>Cancel</Button>
          <Button
            variant={approvalAction === 'approve' || approvalAction === 'reinstate' ? 'success' : 'danger'}
            onClick={executeApproval}
            disabled={approvalLoading || (approvalAction === 'reject' && !approvalReason)}
          >
            {approvalLoading ? 'Processing...' : approvalAction.charAt(0).toUpperCase() + approvalAction.slice(1)}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================ */}
      {/* PERFORMANCE / DETAILS MODAL */}
      {/* ============================================================ */}
      <Modal show={showPerfModal} onHide={() => setShowPerfModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Supplier Details & Performance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {perfLoading && <Spinner animation="border" />}
          {!perfLoading && perfData && (
            <Tabs defaultActiveKey="overview">
              <Tab eventKey="overview" title="Overview">
                <Row className="g-3 mt-2">
                  <Col md={6}>
                    <Card className="p-3">
                      <Card.Title>Contract Details</Card.Title>
                      <Table size="sm">
                        <tbody>
                          <tr><td><strong>Supplier</strong></td><td>{perfData.supplier.name}</td></tr>
                          <tr><td><strong>Type</strong></td><td>{perfData.supplier.supplier_type?.replace('_', ' ')}</td></tr>
                          <tr><td><strong>Status</strong></td><td><Badge bg={statusBadge(perfData.supplier.approval_status)}>{perfData.supplier.approval_status}</Badge></td></tr>
                          <tr><td><strong>Contract Start</strong></td><td>{perfData.supplier.contract_start ? new Date(perfData.supplier.contract_start).toLocaleDateString() : '—'}</td></tr>
                          <tr><td><strong>Contract End</strong></td><td>{perfData.supplier.contract_end ? new Date(perfData.supplier.contract_end).toLocaleDateString() : '—'}</td></tr>
                          <tr><td><strong>Contract Duration</strong></td><td>{perfData.supplier.contract_days ? `${perfData.supplier.contract_days} days` : '—'}</td></tr>
                          <tr><td><strong>Goods Dealt With</strong></td><td>{perfData.supplier.goods_dealt_with || '—'}</td></tr>
                        </tbody>
                      </Table>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="p-3">
                      <Card.Title>Performance Metrics</Card.Title>
                      <Row className="g-2">
                        <Col md={6}><StatCard title="Total Orders" value={perfData.performance.total_orders || 0} variant="primary" /></Col>
                        <Col md={6}><StatCard title="Total Value" value={`KES ${(perfData.performance.total_value || 0).toLocaleString()}`} variant="success" /></Col>
                        <Col md={6}><StatCard title="Reliability" value={`${perfData.performance.reliability_score || 0}%`} variant={perfData.performance.reliability_score >= 80 ? 'success' : 'warning'} /></Col>
                        <Col md={6}><StatCard title="Avg Lead Time" value={`${perfData.performance.avg_lead_time_days || 0} days`} variant="info" /></Col>
                      </Row>
                      <div className="mt-3">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={[
                              { name: 'Received', value: perfData.performance.received || 0 },
                              { name: 'Approved', value: perfData.performance.approved || 0 },
                              { name: 'Pending', value: perfData.performance.pending || 0 },
                              { name: 'Declined', value: perfData.performance.declined || 0 },
                            ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                              {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="products" title="Products">
                <Table striped hover responsive size="sm" className="mt-3">
                  <thead><tr><th>Product</th><th>Category</th><th>Unit Cost</th><th>Lead Time</th><th>Primary</th></tr></thead>
                  <tbody>
                    {perfData.products_supplied?.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No products linked</td></tr>}
                    {perfData.products_supplied?.map((p, i) => (
                      <tr key={i}>
                        <td>{p.name}</td>
                        <td><Badge bg="secondary">{p.category?.replace('_', ' ')}</Badge></td>
                        <td>KES {parseFloat(p.unit_cost || 0).toLocaleString()}</td>
                        <td>{p.lead_time_days || '—'} days</td>
                        <td>{p.is_primary ? <Badge bg="success">Primary</Badge> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Tab>

              <Tab eventKey="orders" title="Recent Orders">
                <Table striped hover responsive size="sm" className="mt-3">
                  <thead><tr><th>PO #</th><th>Date</th><th>Amount</th><th>Status</th><th>Rejection Reason</th></tr></thead>
                  <tbody>
                    {perfData.recent_orders?.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No orders</td></tr>}
                    {perfData.recent_orders?.map(o => (
                      <tr key={o.purchase_order_id}>
                        <td>#{o.purchase_order_id}</td>
                        <td>{o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}</td>
                        <td>KES {parseFloat(o.total_amount || 0).toLocaleString()}</td>
                        <td><Badge bg={statusBadge(o.status)}>{o.status?.replace('_', ' ')}</Badge></td>
                        <td className="text-danger small">{o.rejection_reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Tab>

              <Tab eventKey="spend" title="Monthly Spend">
                {perfData.monthly_spend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300} className="mt-3">
                    <BarChart data={perfData.monthly_spend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={v => `KES ${v.toLocaleString()}`} />
                      <Tooltip formatter={(v) => `KES ${v.toLocaleString()}`} />
                      <Bar dataKey="total" fill="#3b82f6" name="Spend" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert variant="info" className="mt-3">No spend data available</Alert>
                )}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
}

// Simple stat card component
function StatCard({ title, value, variant }) {
  const bgMap = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', info: 'bg-info', danger: 'bg-danger' }
  return (
    <Card className={`text-white ${bgMap[variant] || 'bg-secondary'}`}>
      <Card.Body className="py-2 px-3 text-center">
        <div className="small">{title}</div>
        <div className="fs-5 fw-bold">{value}</div>
      </Card.Body>
    </Card>
  )
}
