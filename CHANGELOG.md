# Changelog

All notable changes to NebulusDB will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-04-27

### Fixed

- Fixed TypeScript errors in core package
- Fixed interface implementation in Collection class
- Fixed rebuildIndexes method in Collection class
- Fixed duplicate identifier issues
- Fixed transaction recovery tests

### Added

- Comprehensive test suite for error handling and recovery mechanisms
- Transaction failure recovery tests
- Data corruption recovery tests
- Network interruption recovery tests
- Adapter-specific error condition tests
- Transaction performance benchmarks

### Improved

- Error handling for various failure scenarios
- Resilience against data corruption
- Recovery from network interruptions
- Handling of adapter-specific error conditions
- Transaction system robustness

## [0.2.1] - 2025-04-25

### Added

- Initial implementation of transaction support
- Basic error handling mechanisms
- Support for multiple adapters
- Plugin architecture

## [0.2.0] - 2025-04-24

### Added

- Advanced indexing system with B-tree implementation for efficient range queries
- Query caching for improved performance on repeated queries
- Batch operations with true parallel processing
- Document compression for reduced memory footprint
- Memory management with chunked document processing
- Adaptive concurrency control for optimal performance

### Improved

- Query optimization with short-circuit evaluation
- Enhanced index selection based on query complexity
- Optimized update and delete operations
- Improved memory usage for large collections
- Better performance for batch operations

### Fixed

- Memory leaks in large collection operations
- Performance bottlenecks in query processing
- Concurrency issues with parallel operations

### Notes

- Requires Node.js 16.x or higher (Node.js 18+ recommended for optimal performance)
- Some development dependencies require Node.js 18+

## [0.1.0] - 2025-04-22

### Added

- Initial release of NebulusDB
- Core database functionality
  - CRUD operations
  - Query engine with MongoDB-like syntax
  - Reactive queries with subscription support
- Adapters
  - Memory adapter
  - LocalStorage adapter
  - IndexedDB adapter
  - FileSystem adapter
- Plugins
  - Validation plugin using Zod
  - Encryption plugin
  - Versioning plugin
- Documentation
  - API reference
  - Usage examples
  - Plugin and adapter guides
- Examples
  - Node.js example application
  - Browser example application
- Tests
  - Unit tests for core functionality
  - Integration tests for adapters and plugins
- Benchmarks
  - Performance comparison with similar databases

## [Billow] - 2025-07-01

### 🚀 Major Features

- **Advanced Indexing**
  - Full support for compound, partial, and multi-field indexes.
  - Efficient partial prefix and multi-field range queries.
  - Robust, tested index logic for all advanced scenarios.

- **Schema Versioning & Migrations**
  - Per-collection schema version tracking.
  - Migration plugin with helpers to get/set schema version.
  - Migration history tracked and queryable for each collection.
  - Automated and manual migration support.

- **Devtools Improvements**
  - Index metadata and schema version visible in the UI for each collection.
  - Migration history for each collection shown on the dashboard.
  - Cleaner, more informative dashboards and collection views.

- **Developer Experience**
  - Improved test coverage and monorepo coverage reporting.
  - Cleaner code, better types, and up-to-date documentation.

---

#### 💡 Upgrade Notes

- To use schema versioning and migrations, install and configure the migration plugin in your project.
- Devtools now require the latest backend for full feature support.

---

#### 🛠️ Contributors

- @your-github-handle and the NebulusDB community

---
