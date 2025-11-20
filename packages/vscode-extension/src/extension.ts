import * as vscode from 'vscode';
import { SchemaProvider } from './providers/schema-provider';
import { PluginProvider } from './providers/plugin-provider';
import { SchemaPreviewPanel } from './panels/schema-preview-panel';
import { DevToolsPanel } from './panels/devtools-panel';
import { SchemaParser } from './parsers/schema-parser';

export function activate(context: vscode.ExtensionContext) {
  console.log('NebulusDB extension is now active');
  
  // Create schema parser
  const schemaParser = new SchemaParser();
  
  // Register schema provider
  const schemaProvider = new SchemaProvider(schemaParser);
  vscode.window.registerTreeDataProvider('nebulus-db-schemas', schemaProvider);
  
  // Register plugin provider
  const pluginProvider = new PluginProvider();
  vscode.window.registerTreeDataProvider('nebulus-db-plugins', pluginProvider);
  
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('nebulus-db.showSchemaPreview', () => {
      SchemaPreviewPanel.createOrShow(context.extensionUri, schemaParser);
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('nebulus-db.openDevTools', () => {
      DevToolsPanel.createOrShow(context.extensionUri);
    })
  );
  
  // Register refresh commands
  context.subscriptions.push(
    vscode.commands.registerCommand('nebulus-db.refreshSchemas', () => {
      schemaProvider.refresh();
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('nebulus-db.refreshPlugins', () => {
      pluginProvider.refresh();
    })
  );
  
  // Watch for changes in TypeScript/JavaScript files
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js}');
  
  fileWatcher.onDidChange(uri => {
    schemaParser.parseFile(uri.fsPath);
    schemaProvider.refresh();
  });
  
  fileWatcher.onDidCreate(uri => {
    schemaParser.parseFile(uri.fsPath);
    schemaProvider.refresh();
  });
  
  fileWatcher.onDidDelete(uri => {
    schemaParser.removeFile(uri.fsPath);
    schemaProvider.refresh();
  });
  
  context.subscriptions.push(fileWatcher);
  
  // Parse all TypeScript/JavaScript files in the workspace
  vscode.workspace.findFiles('**/*.{ts,js}').then(uris => {
    uris.forEach(uri => {
      schemaParser.parseFile(uri.fsPath);
    });
    schemaProvider.refresh();
  });
}

export function deactivate() {
  // Clean up resources
}
