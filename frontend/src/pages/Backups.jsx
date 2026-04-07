// frontend/src/pages/Backups.jsx
// Database backup management — list, create, and delete backups
import { useState } from 'react'
import { Table, Button, Spinner, Alert, Card } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { systemApi } from '../api/system'

/**
 * Backups page — shows existing backup files and allows triggering new backups.
 * Backups are created using mysqldump and stored on the server.
 *
 * NOTE: In production, consider offsite backup storage and encryption.
 */
export default function Backups() {
  // Fetch existing backups
  const { data, loading, error, refetch } = useApi(
    () => systemApi.getBackups(), []
  )

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createSuccess, setCreateSuccess] = useState(null)

  // Trigger a new database backup
  const handleCreate = async () => {
    setCreating(true)
    setCreateError(null)
    setCreateSuccess(null)

    try {
      const res = await systemApi.createBackup()
      setCreateSuccess(res.data.message)
      refetch() // Refresh the backup list
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  // Delete a backup file
  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete backup "${filename}"?`)) return

    try {
      await systemApi.deleteBackup(filename)
      refetch()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete backup')
    }
  }

  // Format file size for display
  const formatSize = (mb) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
    return `${mb} MB`
  }

  return (
    <div>
      <h5 className="mb-4">Database Backups</h5>

      {/* Create backup card */}
      <Card className="p-3 mb-4">
        <Card.Title>Backup Database</Card.Title>
        <Card.Text className="text-muted">
          Create a full database backup using mysqldump. The backup file will be stored on the server.
        </Card.Text>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? 'Creating Backup...' : 'Create Backup'}
        </Button>

        {createError && <Alert variant="danger" className="mt-3">{createError}</Alert>}
        {createSuccess && <Alert variant="success" className="mt-3">{createSuccess}</Alert>}
      </Card>

      {/* Existing backups list */}
      <Card className="p-3">
        <Card.Title>Existing Backups</Card.Title>

        {loading && <Spinner animation="border" />}
        {error && <Alert variant="danger">{error}</Alert>}

        {data && (
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.backups?.length === 0 && (
                <tr><td colSpan="4" className="text-center text-muted">No backups found</td></tr>
              )}
              {data.backups?.map(b => (
                <tr key={b.filename}>
                  <td><code>{b.filename}</code></td>
                  <td>{formatSize(b.size_mb)}</td>
                  <td>{new Date(b.created_at).toLocaleString()}</td>
                  <td>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(b.filename)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
