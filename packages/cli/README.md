# @nebulus-db/cli

CLI tools for NebulusDB

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install -g @nebulus-db/cli
```

## Commands

### `nebulus init`

Initialize a new NebulusDB project in the current directory.

```bash
nebulus init
```

Options:
- `-d, --directory <directory>`: Directory to initialize the project in (default: '.')

### `nebulus generate:adapter <name>`

Generate a new adapter template.

```bash
nebulus generate:adapter my-adapter
```

Options:
- `-d, --directory <directory>`: Directory to create the adapter in (default: './adapters')

### `nebulus generate:plugin <name>`

Generate a new plugin template.

```bash
nebulus generate:plugin my-plugin
```

Options:
- `-d, --directory <directory>`: Directory to create the plugin in (default: './plugins')

### `nebulus devtools`

Launch NebulusDB devtools server.

```bash
nebulus devtools
```

Options:
- `-p, --port <port>`: Port to run the devtools on (default: '3000')

### `nebulus migrate`

Run database migrations.

```bash
nebulus migrate
```

Options:
- `-d, --directory <directory>`: Directory containing migration files (default: './migrations')
- `-c, --config <config>`: Path to configuration file (default: './nebulus.config.js')

## Usage Examples

```bash
# Initialize a new project
nebulus init

# Generate an adapter
nebulus generate:adapter sqlite-adapter

# Generate a plugin
nebulus generate:plugin validation-plugin

# Launch devtools
nebulus devtools --port 3333

# Run migrations
nebulus migrate --config ./config/nebulus.js
```

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
