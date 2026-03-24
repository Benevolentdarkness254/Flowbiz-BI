// frontend/src/pages/Login.jsx
import { useState }        from 'react'
import { useNavigate }     from 'react-router-dom'
import { Container, Card, Form, Button, Alert } from 'react-bootstrap'
import { useAuth }         from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Card style={{ width: 380 }} className="shadow-sm p-4">
        <h4 className="text-center mb-4">Flowbiz</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control value={username} onChange={e => setUsername(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </Form.Group>
          <Button type="submit" className="w-100" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </Form>
      </Card>
    </Container>
  )
}