// frontend/src/components/common/SupplierForm.jsx
// Form component for creating and editing suppliers with contact management
import { useState } from 'react'
import { Form, Button, Row, Col, Alert } from 'react-bootstrap'

export default function SupplierForm({ supplier = null, onSave }) {
  const [formData, setFormData] = useState({
    name: supplier ? supplier.name : '',
    supplier_type: supplier ? supplier.supplier_type : 'raw_water',
    kra_pin: supplier ? supplier.kra_pin : '',
    payment_terms: supplier ? supplier.payment_terms : 30,
    address: supplier ? supplier.address : '',
    is_active: supplier !== null ? supplier.is_active : true,
    contacts: supplier ? supplier.contacts || [] : [{ contact_name: '', role: '', phone: '', email: '', is_primary: false }]
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Handle input changes
  const handleChange = (field, value, index = null) => {
    setFormData(prev => {
      if (index !== null && field === 'contacts') {
        const contacts = [...prev.contacts]
        contacts[index] = { ...contacts[index], ...value }
        return { ...prev, contacts }
      }
      return { ...prev, [field]: value }
    })
    
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Handle contact changes
  const handleContactChange = (index, field, value) => {
    handleChange('contacts', { ...formData.contacts[index], [field]: value }, index)
  }

  // Add new contact
  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { contact_name: '', role: '', phone: '', email: '', is_primary: false }]
    }))
  }

  // Remove contact
  const removeContact = (index) => {
    if (formData.contacts.length <= 1) {
      alert('At least one contact is required')
      return
    }
    setFormData(prev => {
      const contacts = [...prev.contacts]
      contacts.splice(index, 1)
      return { ...prev, contacts }
    })
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      // Validate form
      const newErrors = {}
      if (!formData.name.trim()) newErrors.name = 'Supplier name is required'
      if (!formData.supplier_type) newErrors.supplier_type = 'Supplier type is required'
      if (formData.payment_terms < 0) newErrors.payment_terms = 'Payment terms must be positive'
      
      // Validate at least one contact
      const hasValidContact = formData.contacts.some(c => 
        c.contact_name.trim() && (c.phone.trim() || c.email.trim())
      )
      if (!hasValidContact) newErrors.contacts = 'At least one contact with name and phone/email is required'

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        setLoading(false)
        return
      }

      // Save supplier
      let response
      if (supplier) {
        response = await suppliersApi.update(supplier.supplier_id, formData)
      } else {
        response = await suppliersApi.create(formData)
      }
      
      onSave()
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save supplier'
      setErrors({ submit: message })
      setLoading(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      {Object.keys(errors).length > 0 && (
        <Alert variant="danger">
          {Object.values(errors).map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label>Supplier Name</Form.Label>
        <Form.Control
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          isInvalid={!!errors.name}
        />
        {errors.name && <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>}
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Supplier Type</Form.Label>
        <Form.Select
          value={formData.supplier_type || 'raw_water'}
          onChange={(e) => handleChange('supplier_type', e.target.value)}
          isInvalid={!!errors.supplier_type}
        >
          <option value="raw_water">Raw Water</option>
          <option value="chemicals">Chemicals</option>
          <option value="equipment">Equipment</option>
          <option value="services">Services</option>
        </Form.Select>
        {errors.supplier_type && <Form.Control.Feedback type="invalid">{errors.supplier_type}</Form.Control.Feedback>}
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>KRA PIN</Form.Label>
        <Form.Control
          type="text"
          value={formData.kra_pin || ''}
          onChange={(e) => handleChange('kra_pin', e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Payment Terms (days)</Form.Label>
        <Form.Control
          type="number"
          value={formData.payment_terms || ''}
          onChange={(e) => handleChange('payment_terms', parseInt(e.target.value) || 0)}
          min="0"
        />
        {errors.payment_terms && <Form.Control.Feedback type="invalid">{errors.payment_terms}</Form.Control.Feedback>}
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Address</Form.Label>
        <Form.Control
          type="textarea"
          rows={3}
          value={formData.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Status</Form.Label>
        <Form.Check
          type="checkbox"
          label="Active"
          checked={formData.is_active}
          onChange={(e) => handleChange('is_active', e.target.checked)}
        />
      </Form.Group>

      <hr />

      <Form.Group className="mb-3">
        <Form.Label>Contacts</Form.Label>
        {formData.contacts.map((contact, index) => (
          <div key={index} className="border rounded p-3 mb-3">
            <Row className="mb-2">
              <Col>
                <Form.Label>Contact #{index + 1}</Form.Label>
              </Col>
              {formData.contacts.length > 1 && (
                <Col className="text-end">
                  <Button variant="outline-danger" size="sm" onClick={() => removeContact(index)}>
                    Remove
                  </Button>
                </Col>
              )}
            </Row>
            
            <Row>
              <Col md={3}>
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  value={contact.contact_name || ''}
                  onChange={(e) => handleContactChange(index, 'contact_name', e.target.value)}
                  isInvalid={!!errors.contacts && index === 0}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Role</Form.Label>
                <Form.Control
                  type="text"
                  value={contact.role || ''}
                  onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="tel"
                  value={contact.phone || ''}
                  onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={contact.email || ''}
                  onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                />
              </Col>
            </Row>
            
            <Row className="mt-2">
              <Col>
                <Form.Check
                  type="checkbox"
                  label="Primary Contact"
                  checked={contact.is_primary}
                  onChange={(e) => handleContactChange(index, 'is_primary', e.target.checked)}
                />
              </Col>
            </Row>
           </div>
        ))}
        
        <Button variant="outline-secondary" size="sm" onClick={addContact}>
          Add Another Contact
        </Button>
      </Form.Group>

      <Button variant="primary" type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Supplier'}
      </Button>
      <Button variant="secondary" type="button" onClick={onSave}>
        Cancel
      </Button>
    </Form>
  )
}