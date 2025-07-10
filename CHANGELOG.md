# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation and open source setup
- GitHub issue templates for bug reports and feature requests
- Contributing guidelines and code of conduct
- MIT license for open source distribution

## [1.2.0] - 2025-01-09

### Added
- Enhanced popup interface with tabbed layout for better organization
- Support for Msty Studio configurations extracted from Claude Desktop config
- Improved error handling with user-friendly messages
- Better responsive design for various screen sizes
- Copy success feedback with visual confirmation

### Changed
- Popup now uses tabs instead of a single scrollable list
- Improved configuration parsing for better reliability
- Enhanced clipboard functionality with fallback methods
- Better error messages for debugging

### Fixed
- Clipboard operations now work across different browser environments
- Configuration parsing handles edge cases more gracefully
- Popup styling is more consistent across different websites

## [1.1.0] - 2024-12-15

### Added
- Support for multiple development tools (Cursor, Windsurf, VSCode, etc.)
- Improved configuration parsing from gitmcp.io
- Enhanced clipboard functionality with modern API support
- Better error handling for network issues

### Changed
- Improved HTML parsing for more reliable configuration extraction
- Better context menu organization
- Enhanced popup styling and usability

### Fixed
- Fixed issues with HTML entity decoding in configurations
- Improved reliability of configuration fetching
- Better handling of malformed JSON responses

## [1.0.0] - 2024-11-20

### Added
- Initial release of GitMCP JSON Copier
- Context menu integration for GitHub repository links
- Basic MCP configuration copying functionality
- Support for Claude Desktop configurations
- Simple popup interface for configuration display
- Direct integration with gitmcp.io service

### Features
- Right-click context menu on GitHub links
- One-click configuration copying
- Basic error handling
- Clean popup interface
- Chrome Extension Manifest V3 support

---

## Legend

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities
