const path = require('path');

module.exports = {
  entry: {
    'index': './src/index.ts',
    'browser': './src/browser-adapter.ts',
    'node': './src/node-adapter.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'fs': 'commonjs fs',
    'path': 'commonjs path'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        browser: {
          test: /browser-adapter/,
          name: 'browser',
          enforce: true
        },
        node: {
          test: /node-adapter/,
          name: 'node',
          enforce: true
        }
      }
    }
  }
};