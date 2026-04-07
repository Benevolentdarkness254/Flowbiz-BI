# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Suppliers Management API with full CRUD operations and performance metrics
- Enhanced delivery tracking with GPS location updates for outbound deliveries
- Detailed inbound delivery pages with countdown timers and comprehensive summaries
- Supplier performance analytics feeding into reports and dashboard
- Communication links (email/phone) between users and suppliers
- Leaflet-based map visualization for delivery tracking
- New navigation items for Suppliers and Enhanced Deliveries pages

### Changed
- Updated deliveries API to include location tracking endpoints
- Fixed JWT identity handling in sales API (was treating string as object)
- Replaced missing stored procedure for receipt number generation with Python-based implementation
- Updated nav.config.js to include Suppliers and Enhanced Deliveries navigation items
- Updated App.jsx routing to include new supplier and enhanced delivery pages
- Enhanced Reports page to include supplier performance metrics

### Fixed
- LSP type hint errors in various files (non-runtime issues)
- Supplier API client creation in frontend
- Delivery detail endpoint parsing for location data
- Inbound delivery detail endpoint for countdown functionality

## [Previous Version]
- Initial release of Flowbiz-BI system
