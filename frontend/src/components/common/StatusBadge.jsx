// frontend/src/components/common/StatusBadge.jsx
import { Badge } from 'react-bootstrap'
import { STATUS_VARIANT } from '../../nav.config'

/**
 * Maps ENUM string values to Bootstrap Badge variants.
 * Example: <StatusBadge status="paid" /> renders a green badge.
 */
export default function StatusBadge({ status }) {
  const variant = STATUS_VARIANT[status] ?? 'secondary'
  return <Badge bg={variant}>{status?.replace('_', ' ')}</Badge>
}