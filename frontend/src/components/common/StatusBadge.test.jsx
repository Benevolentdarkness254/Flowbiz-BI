// frontend/src/components/common/StatusBadge.test.jsx
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

test('renders paid status as success badge', () => {
  render(<StatusBadge status="paid" />)
  expect(screen.getByText('paid')).toBeInTheDocument()
})

test('renders cancelled status', () => {
  render(<StatusBadge status="cancelled" />)
  expect(screen.getByText('cancelled')).toBeInTheDocument()
})