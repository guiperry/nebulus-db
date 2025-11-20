# NebulusDB VS Code Extension

The official VS Code extension for NebulusDB - a TypeScript-first embedded database optimized for modern development.

## Features

This extension provides several features to enhance your development experience with NebulusDB:

### Code Snippets

Quickly insert common NebulusDB code patterns with these snippets:

- `ndb-create-db`: Create a new NebulusDB database instance
- `ndb-collection`: Create a new collection
- `ndb-insert`: Insert a document
- `ndb-find`: Find documents
- `ndb-update`: Update documents
- `ndb-delete`: Delete documents
- `ndb-reactive`: Create a reactive query
- `ndb-example`: Insert a complete NebulusDB usage example

### Commands

Access NebulusDB functionality through the Command Palette (Ctrl+Shift+P or Cmd+Shift+P):

- **NebulusDB: Create Configuration File** - Creates a `nebulus.config.ts` file in your project
- **NebulusDB: Initialize Project** - Sets up a basic NebulusDB project structure
- **NebulusDB: Open Documentation** - Opens the NebulusDB documentation

### NebulusDB Explorer

View your database collections in the Explorer sidebar.

## Requirements

- Visual Studio Code 1.60.0 or higher
- Node.js 14.0.0 or higher

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Open a TypeScript or JavaScript project
3. Run the "NebulusDB: Initialize Project" command to set up your project
4. Start using the snippets in your code files

## Using the Extension

### Creating a New NebulusDB Project

1. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Run "NebulusDB: Initialize Project"
3. This will create:
   - `nebulus.config.ts` - Configuration file for your database
   - `db.ts` - Database initialization file

### Using Snippets

In any TypeScript or JavaScript file, type one of the snippet prefixes (e.g., `ndb-find`) and press Tab to insert the snippet.

## Release Notes

### 0.1.0

Initial release of the NebulusDB VS Code Extension with:
- Code snippets for common operations
- Project initialization commands
- Basic collection explorer

## About NebulusDB

NebulusDB is a TypeScript-first embedded database with:
- Reactive queries
- Plugin architecture
- Multiple storage adapters (Memory, IndexedDB, SQLite, Redis)
- Type-safe API

Visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB) for more information.
