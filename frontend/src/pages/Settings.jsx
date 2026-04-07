// frontend/src/pages/Settings.jsx
// System settings page — view and update configuration
import { useState, useEffect } from 'react'
import { Card, Form, Button, Spinner, Alert, Row, Col, Tabs, Tab, InputGroup } from 'react-bootstrap'
import { useApi } from '../hooks/useApi'
import { systemApi } from '../api/system'

/**
 * Settings page — manage system configuration.
 * Three tabs: General (company info, tax, currency, zone ETA),
 * Integrations (M-Pesa, SMS, KRA), and Zone ETA.
 * Changes are saved via PATCH /api/system/settings.
 */
export default function Settings() {
  // Fetch current settings
  const { data, loading, error, refetch } = useApi(
    () => systemApi.getSettings(), []
  )

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [activeTab, setActiveTab] = useState('general')

  // Local settings state — initialized from API response
  const [settings, setSettings] = useState({})

  // Initialize settings from API response when data loads
  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings)
    }
  }, [data])

  // Update a single setting value
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Save all changed settings to the backend
  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(null)
    setSaveError(null)

    try {
      await systemApi.updateSettings(settings)
      setSaveSuccess('Settings saved successfully')
      refetch()
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner animation="border" />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div>
      <h5 className="mb-4">System Settings</h5>

      {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
      {saveError && <Alert variant="danger">{saveError}</Alert>}

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-4">
        {/* ============================================================ */}
        {/* TAB 1: General Settings */}
        {/* ============================================================ */}
        <Tab eventKey="general" title="General">
          <Card className="p-3">
            <Card.Title>Company Information</Card.Title>

            <Form.Group className="mb-3">
              <Form.Label>Company Name</Form.Label>
              <Form.Control
                value={settings.company_name || ''}
                onChange={e => updateSetting('company_name', e.target.value)}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>KRA PIN</Form.Label>
                  <Form.Control
                    value={settings.company_kra_pin || ''}
                    onChange={e => updateSetting('company_kra_pin', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    value={settings.company_phone || ''}
                    onChange={e => updateSetting('company_phone', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={settings.company_address || ''}
                onChange={e => updateSetting('company_address', e.target.value)}
              />
            </Form.Group>

            <Card.Title className="mt-3">Financial</Card.Title>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Tax Rate</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.tax_rate || 0}
                      onChange={e => updateSetting('tax_rate', parseFloat(e.target.value) || 0)}
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Current: {(settings.tax_rate * 100).toFixed(0)}%
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Control
                    value={settings.currency || 'KES'}
                    onChange={e => updateSetting('currency', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Default Low Stock Threshold</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={settings.low_stock_threshold_default || 10}
                    onChange={e => updateSetting('low_stock_threshold_default', parseInt(e.target.value) || 0)}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Zone ETA Configuration */}
            <Card.Title className="mt-3">Delivery ETA by Zone (minutes)</Card.Title>
            <Card.Text className="text-muted small">
              Auto-estimated delivery time per zone. Used when creating outbound deliveries.
            </Card.Text>
            <Row>
              {['Zone A', 'Zone B', 'Zone C', 'Zone D', 'default'].map(zone => (
                <Col md={2} key={zone}>
                  <Form.Group className="mb-3">
                    <Form.Label>{zone === 'default' ? 'Default' : zone}</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={(settings.zone_eta?.[zone]) || 45}
                      onChange={e => {
                        const updated = { ...(settings.zone_eta || {}), [zone]: parseInt(e.target.value) || 45 }
                        updateSetting('zone_eta', updated)
                      }}
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>

            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Card>
        </Tab>

        {/* ============================================================ */}
        {/* TAB 2: Integration Settings */}
        {/* ============================================================ */}
        <Tab eventKey="integrations" title="Integrations">
          <Card className="p-3">
            <Card.Title>External Integrations</Card.Title>
            <Card.Text className="text-muted">
              Enable or disable external service integrations. API keys and credentials are configured server-side.
            </Card.Text>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="mpesa-switch"
                label="M-Pesa Payments"
                checked={settings.mpesa_enabled || false}
                onChange={e => updateSetting('mpesa_enabled', e.target.checked)}
              />
              <Form.Text className="text-muted">
                Enable M-Pesa STK Push for payment collection via Safaricom Daraja API.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="sms-switch"
                label="SMS Notifications"
                checked={settings.sms_enabled || false}
                onChange={e => updateSetting('sms_enabled', e.target.checked)}
              />
              <Form.Text className="text-muted">
                Enable SMS receipt delivery via Africa's Talking or Twilio.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="kra-switch"
                label="KRA eTIMS Integration"
                checked={settings.kra_etims_enabled || false}
                onChange={e => updateSetting('kra_etims_enabled', e.target.checked)}
              />
              <Form.Text className="text-muted">
                Enable automatic invoice submission to Kenya Revenue Authority eTIMS.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="autobackup-switch"
                label="Automatic Backups"
                checked={settings.auto_backup_enabled || false}
                onChange={e => updateSetting('auto_backup_enabled', e.target.checked)}
              />
              <Form.Text className="text-muted">
                Enable scheduled automatic database backups.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>KRA Submission Mode</Form.Label>
              <Form.Select
                value={settings.kra_submission_mode || 'auto'}
                onChange={e => updateSetting('kra_submission_mode', e.target.value)}
              >
                <option value="auto">Automatic (background job)</option>
                <option value="manual">Manual (requires user action)</option>
              </Form.Select>
            </Form.Group>

            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Card>
        </Tab>
      </Tabs>
    </div>
  )
}
