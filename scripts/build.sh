#!/bin/bash

# Install root dependencies
npm install

# Build core package
cd packages/core
npm install
npm run build
cd ../..

# Build adapters
for dir in packages/adapter-*/; do
  if [ -d "$dir" ]; then
    echo "Building $dir"
    cd "$dir"
    npm install
    npm run build
    cd ../..
  fi
done

# Build validation plugin
cd packages/plugins/validation
npm install
npm run build
cd ../../..

# Build encryption plugin
cd packages/plugins/encryption
npm install
npm run build
cd ../../..

# Build versioning plugin
cd packages/plugins/versioning
npm install
npm run build
cd ../../..

# Install test dependencies
cd tests
npm install
cd ..

echo "Build completed successfully!"
