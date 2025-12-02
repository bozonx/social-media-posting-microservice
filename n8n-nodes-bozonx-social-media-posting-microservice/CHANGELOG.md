# Changelog

All notable changes to this n8n node package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-12-02

### Changed
- Updated node to match current microservice API structure
- Improved error handling for both publish and preview operations
- Enhanced subtitle to show operation and platform
- Better HTTP error handling with proper response parsing

### Added
- Support for `requestId` in error responses
- Detailed error codes in preview validation failures
- Improved documentation with troubleshooting section
- Configuration examples for microservice `config.yaml`

### Fixed
- Preview operation error handling now correctly processes validation errors
- HTTP errors are now properly caught and formatted
- Error messages now include error codes for better debugging

## [1.2.0] - 2024-11-14

### Added
- Initial release with full support for POST /post and POST /preview endpoints
- Support for Telegram platform
- Multiple post types: text, image, video, audio, album, document
- Flexible authentication: channel-based and inline credentials
- MediaInput support with URL and fileId
- Platform-specific options (inline keyboards, parse mode, etc.)
- Idempotency key support
- Content conversion between HTML, Markdown, and plain text
- Preview mode for validation without publishing

### Features
- Continue-on-fail support for error handling
- Automatic retry logic (handled by microservice)
- Comprehensive parameter validation
- JSON parsing for media and options fields
