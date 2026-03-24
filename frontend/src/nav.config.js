// frontend/src/nav.config.js
/**
 * Single source of truth for navigation items.
 * The Sidebar component reads this list and filters it by permission.
 * Adding a new page: add an entry here. No other file needs to change.
 */
export const NAV_ITEMS = [
  { label: 'Dashboard',       path: '/',                permission: null },
  { label: 'Sales',           path: '/sales',           permission: 'sale.view' },
  { label: 'Customers',       path: '/customers',       permission: 'customer.manage' },
  { label: 'Inventory',       path: '/inventory',       permission: 'inventory.view' },
  { label: 'Purchase Orders', path: '/purchase-orders', permission: 'po.view' },
  { label: 'Receipts',        path: '/receipts',        permission: 'receipt.issue' },
  { label: 'Reports',         path: '/reports',         permission: 'report.view' },
  { label: 'Settings',        path: '/settings',        permission: 'system.config' },
]

// Map database ENUM values to Bootstrap badge variants
export const STATUS_VARIANT = {
  paid:      'success',
  pending:   'warning',
  partial:   'info',
  refunded:  'secondary',
  cancelled: 'danger',
  approved:  'success',
  declined:  'danger',
  draft:     'light',
  ok:        'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
}