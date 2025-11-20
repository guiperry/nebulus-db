#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to update a package.json file
function updatePackageJson(filePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Skip node_modules
    if (filePath.includes('node_modules')) {
      return;
    }
    
    // Skip the root package.json (we've already updated it)
    if (packageJson.name === 'nebulus-db') {
      return;
    }
    
    let modified = false;
    
    // Update package name from @nebulus/* to @nebulus-db/*
    if (packageJson.name && packageJson.name.startsWith('@nebulus/')) {
      packageJson.name = packageJson.name.replace('@nebulus/', '@nebulus-db/');
      modified = true;
    }
    
    // Update peer dependencies
    if (packageJson.peerDependencies) {
      Object.keys(packageJson.peerDependencies).forEach(dep => {
        if (dep.startsWith('@nebulus/')) {
          const newDep = dep.replace('@nebulus/', '@nebulus-db/');
          packageJson.peerDependencies[newDep] = packageJson.peerDependencies[dep];
          delete packageJson.peerDependencies[dep];
          modified = true;
        }
      });
    }
    
    // Update dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        if (dep.startsWith('@nebulus/')) {
          const newDep = dep.replace('@nebulus/', '@nebulus-db/');
          packageJson.dependencies[newDep] = packageJson.dependencies[dep];
          delete packageJson.dependencies[dep];
          modified = true;
        }
      });
    }
    
    // Add repository field if it doesn't exist
    if (!packageJson.repository) {
      // Extract the relative path from the full path
      const relativePath = filePath
        .replace(/^.*\/NebulusDB\//, '')
        .replace(/\/package\.json$/, '');
      
      packageJson.repository = {
        type: 'git',
        url: 'https://github.com/Nom-nom-hub/NebulusDB.git',
        directory: relativePath
      };
      modified = true;
    }
    
    // Add publishConfig if it doesn't exist
    if (!packageJson.publishConfig) {
      packageJson.publishConfig = {
        access: 'public'
      };
      modified = true;
    }
    
    // Update author if it's empty
    if (!packageJson.author || packageJson.author === '') {
      packageJson.author = 'Nom-nom-hub';
      modified = true;
    }
    
    // Write the updated package.json back to the file
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`Updated ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Function to recursively find all package.json files
function findPackageJsonFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findPackageJsonFiles(filePath);
    } else if (file === 'package.json') {
      updatePackageJson(filePath);
    }
  });
}

// Start the process from the packages directory
findPackageJsonFiles(path.join(__dirname, '..', 'packages'));
console.log('Package.json files have been updated!');
