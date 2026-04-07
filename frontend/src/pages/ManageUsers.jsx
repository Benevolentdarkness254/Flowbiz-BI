// frontend/src/pages/ManageUsers.jsx
// User management page — admin can create, edit, deactivate, and restore users
import { useState } from 'react'
import {
  Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col, InputGroup
} from 'react-bootstrap'
import { Eye, EyeSlash } from 'react-bootstrap-icons'
import { useApi } from '../hooks/useApi'
import { usersApi } from '../api/users'

/**
 * Manage Users page — only visible to users with user.view permission.
 * Provides full CRUD: create, edit, deactivate (soft-delete), and restore users.
 * Admins cannot delete or deactivate their own account.
 */
export default function ManageUsers() {
  // Fetch users and roles from the API
  const { data, loading, error, refetch } = useApi(
    () => usersApi.getUsers(), []
  )
  const { data: rolesData } = useApi(() => usersApi.getRoles(), [])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_name: '',
    phone: '',
  })

  // Confirm delete modal state
  const [userToDelete, setUserToDelete] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Open the create user modal
  const openCreate = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role_name: '',
      phone: '',
    })
    setShowPassword(false)
    setSubmitError(null)
    setShowModal(true)
  }

  // Open the edit user modal
  const openEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      password: '', // leave blank to keep existing password
      role_name: user.role_name,
      phone: user.phone || '',
    })
    setShowPassword(false)
    setSubmitError(null)
    setShowModal(true)
  }

  // Submit the form for create or update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      if (editingUser) {
        // Build payload — only send changed fields
        const payload = {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          role_name: formData.role_name,
        }
        // Only send password if the admin typed a new one
        if (formData.password) {
          payload.password = formData.password
        }
        await usersApi.updateUser(editingUser.user_id, payload)
      } else {
        // Create requires all fields
        await usersApi.createUser(formData)
      }
      setShowModal(false)
      refetch()
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.response?.data?.errors || 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm and execute user deletion (soft-delete)
  const confirmDelete = (user) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const executeDelete = async () => {
    if (!userToDelete) return
    setDeleteLoading(true)

    try {
      await usersApi.deleteUser(userToDelete.user_id)
      setShowDeleteConfirm(false)
      refetch()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate user')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Restore a soft-deleted user
  const handleRestore = async (user) => {
    try {
      await usersApi.restoreUser(user.user_id)
      refetch()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restore user')
    }
  }

  // Role badge color mapping
  const roleBadgeColor = (role) => {
    const map = {
      system_admin: 'danger',
      business_owner: 'primary',
      sales_staff: 'success',
      inventory_staff: 'info',
      driver: 'warning',
    }
    return map[role] || 'secondary'
  }

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Manage Users</h5>
        <Button variant="primary" size="sm" onClick={openCreate}>
          New User
        </Button>
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.users?.length === 0 && (
            <tr>
              <td colSpan="9" className="text-center text-muted">
                No users found. Click "New User" to add one.
              </td>
            </tr>
          )}
          {data?.users?.map(u => (
            <tr key={u.user_id} style={u.deleted_at ? { opacity: 0.5 } : {}}>
              <td>{u.user_id}</td>
              <td>
                <code>{u.username}</code>
                {u.deleted_at && <Badge bg="danger" className="ms-2">Deleted</Badge>}
              </td>
              <td>{u.full_name}</td>
              <td>{u.email}</td>
              <td>{u.phone || '—'}</td>
              <td>
                <Badge bg={roleBadgeColor(u.role_name)}>
                  {u.role_name?.replace(/_/g, ' ')}
                </Badge>
              </td>
              <td>
                <Badge bg={u.is_active ? 'success' : 'secondary'}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td>
                {u.last_login_at
                  ? new Date(u.last_login_at).toLocaleDateString()
                  : 'Never'}
              </td>
              <td>
                <div className="btn-group btn-group-sm">
                  <Button variant="outline-primary" size="sm" onClick={() => openEdit(u)}>
                    Edit
                  </Button>
                  {!u.deleted_at && (
                    <Button variant="outline-danger" size="sm" onClick={() => confirmDelete(u)}>
                      Deactivate
                    </Button>
                  )}
                  {u.deleted_at && (
                    <Button variant="outline-success" size="sm" onClick={() => handleRestore(u)}>
                      Restore
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Create/Edit User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? 'Edit User' : 'New User'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {submitError && <Alert variant="danger">{submitError}</Alert>}

            {!editingUser && (
              <Form.Group className="mb-3">
                <Form.Label>Username *</Form.Label>
                <Form.Control
                  required
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. jane_doe"
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Full Name *</Form.Label>
              <Form.Control
                required
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+2547XXXXXXXX"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Role *</Form.Label>
              <Form.Select
                required
                value={formData.role_name}
                onChange={e => setFormData({ ...formData, role_name: e.target.value })}
              >
                <option value="">Select a role</option>
                {rolesData?.roles?.map(r => (
                  <option key={r.role_id} value={r.role_name}>
                    {r.role_name?.replace(/_/g, ' ')}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  required={!editingUser}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Min 8 characters'}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlash /> : <Eye />}
                </Button>
              </InputGroup>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Deactivate User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            This will deactivate <strong>{userToDelete?.username}</strong>.
            They will no longer be able to log in. This action can be reversed.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={executeDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
