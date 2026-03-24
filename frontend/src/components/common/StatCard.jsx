// frontend/src/components/common/StatCard.jsx
import { Card, Spinner } from 'react-bootstrap'

/**
 * Reusable KPI card for the dashboard.
 * Shows a loading spinner while data is fetching.
 */
export default function StatCard({ title, value, subtitle, variant = 'primary', loading }) {
  return (
    <Card className={`border-start border-${variant} border-4 shadow-sm`}>
      <Card.Body>
        <div className="text-muted small text-uppercase fw-semibold">{title}</div>
        <div className="fs-2 fw-bold mt-1">
          {loading ? <Spinner size="sm" /> : value ?? '—'}
        </div>
        {subtitle && <div className="text-muted small mt-1">{subtitle}</div>}
      </Card.Body>
    </Card>
  )
}