// frontend/src/nav.config.js
/**
 * Single source of truth for navigation items.
 * The Sidebar component reads this list and filters it by permission.
 * Adding a new page: add an entry here. No other file needs to change.
 *
 * Icons are inline SVG paths — no external icon library dependency.
 */

// Simple SVG icon definitions for each nav item
export const ICONS = {
  dashboard:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.5A1.5 1.5 0 0 1 1.5 0h2A1.5 1.5 0 0 1 5 1.5v2A1.5 1.5 0 0 1 3.5 5h-2A1.5 1.5 0 0 1 0 3.5v-2zM6 0h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 8 5H6V0zm6 1.5A1.5 1.5 0 0 1 13.5 0h2A1.5 1.5 0 0 1 17 1.5v2A1.5 1.5 0 0 1 15.5 5h-2A1.5 1.5 0 0 1 12 3.5v-2zM0 7h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 3.5 12h-2A1.5 1.5 0 0 1 0 10.5v-2zm6 0h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 8 12H6V7zm6 0h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 15.5 12h-2a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 12 7zm-6 6h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 8 18H6v-2a1.5 1.5 0 0 1 1.5-1.5z"/></svg>',
  sales:        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.5A1.5 1.5 0 0 1 1.5 0h2A1.5 1.5 0 0 1 5 1.5v2A1.5 1.5 0 0 1 3.5 5h-2A1.5 1.5 0 0 1 0 3.5v-2zM6 0h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 8 5H6V0zm6 1.5A1.5 1.5 0 0 1 13.5 0h2A1.5 1.5 0 0 1 17 1.5v2A1.5 1.5 0 0 1 15.5 5h-2A1.5 1.5 0 0 1 12 3.5v-2zM0 7h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 3.5 12h-2A1.5 1.5 0 0 1 0 10.5v-2zm6 0h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 8 12H6V7zm6 0h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 15.5 12h-2a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 12 7zm-6 6h2a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 8 18H6v-2a1.5 1.5 0 0 1 1.5-1.5z"/></svg>',
  customers:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg>',
  inventory:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 7.76A.75.75 0 0 1 .5 7h2.765l.35-3.5a.75.75 0 0 1 .75-.75h7.27a.75.75 0 0 1 .75.75l.35 3.5H15.5a.75.75 0 0 1 0 1.5h-2.765l-.35 3.5a.75.75 0 0 1-.75.75H4.365a.75.75 0 0 1-.75-.75l-.35-3.5H.5a.75.75 0 0 1-.5-.79zm4.115-3.75L3.765 7.5h8.47l-.35-3.5H4.115zM3.765 9l.35 3.5h7.77l.35-3.5H3.765z"/></svg>',
  purchaseOrders: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/><path d="M4.5 6h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0 2h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0 2h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1z"/></svg>',
  receipts:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>',
  reports:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 0h1v15h15v1H0V0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07z"/></svg>',
  deliveries:   '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5v-7zm1.294 7.456A1.999 1.999 0 0 1 4.732 11h5.536a2.01 2.01 0 0 1 .732-.732V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456zM12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12v4zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
  systemLogs:   '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><path d="M4.5 4a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7zm0 3a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7zm0 3a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4z"/></svg>',
  auditTrail:   '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.25-11.25v4.5a.25.25 0 0 1-.5 0v-4.5a.25.25 0 0 1 .5 0zM8 12a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z"/></svg>',
  backups:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm2-1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H2z"/><path d="M2 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/></svg>',
  settings:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.116l.094-.318z"/></svg>',
}

export const NAV_ITEMS = [
  { label: 'Dashboard',       path: '/',                permission: null,             icon: ICONS.dashboard },
  { label: 'Sales',           path: '/sales',           permission: 'sale.view',      icon: ICONS.sales },
  { label: 'Customers',       path: '/customers',       permission: 'customer.manage', icon: ICONS.customers },
  { label: 'Inventory',       path: '/inventory',       permission: 'inventory.view',  icon: ICONS.inventory },
  { label: 'Purchase Orders', path: '/purchase-orders', permission: 'po.view',         icon: ICONS.purchaseOrders },
  { label: 'Receipts',        path: '/receipts',        permission: 'receipt.issue',   icon: ICONS.receipts },
  { label: 'Reports',         path: '/reports',         permission: 'report.view',     icon: ICONS.reports },
  { label: 'Deliveries',      path: '/deliveries',      permission: 'delivery.view',   icon: ICONS.deliveries },
  { label: 'System Logs',     path: '/system/logs',     permission: 'system.logs',     icon: ICONS.systemLogs },
  { label: 'Audit Trail',     path: '/system/audit',    permission: 'system.audit',    icon: ICONS.auditTrail },
  { label: 'Backups',         path: '/system/backups',  permission: 'system.backup',   icon: ICONS.backups },
  { label: 'Settings',        path: '/settings',        permission: 'system.config',   icon: ICONS.settings },
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