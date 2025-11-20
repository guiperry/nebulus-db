# @nebulus-db/devtools

DevTools for NebulusDB - A web-based interface for debugging and managing NebulusDB instances.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/devtools
```

## Usage

### Development

To run the devtools in development mode:

```bash
npm run dev
```

This will start a development server on `http://localhost:5173` (default Vite port).

### Build

To build the devtools for production:

```bash
npm run build
```

### Preview

To preview the built devtools:

```bash
npm run preview
```

## Features

- **Collection Viewer**: Browse and inspect database collections
- **Document Viewer**: View and edit individual documents
- **Query Builder**: Construct and execute queries
- **Plugin Monitor**: Monitor plugin activity and performance
- **Event Log**: View database events and operations

## Connecting to NebulusDB

The devtools can connect to NebulusDB instances via WebSocket or HTTP. Make sure your NebulusDB server has the sync plugin enabled for real-time updates.

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
