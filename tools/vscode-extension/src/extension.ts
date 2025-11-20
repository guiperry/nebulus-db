import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Configuration template for NebulusDB
const nebulusConfigTemplate = `// NebulusDB Configuration
import { MemoryAdapter } from '@nebulus-db/nebulus-db';

export default {
  adapter: new MemoryAdapter(), // Use appropriate adapter: MemoryAdapter, IndexedDBAdapter, etc.
  options: {
    // Adapter-specific options
  },
  collections: {
    // Define your collections here
    users: {
      schema: {
        id: { type: 'string', optional: true },
        name: { type: 'string' },
        email: { type: 'string' },
        age: { type: 'number' }
      },
      indexes: ['email']
    }
  }
};
`;

// Project initialization template
const projectInitTemplate = `import { createDatabase } from '@nebulus-db/nebulus-db';
import config from './nebulus.config.ts';

// Create database instance with configuration
const db = createDatabase(config);

// Export collections for use in your application
export const users = db.collection('users');

// Export the database instance
export default db;
`;

export function activate(context: vscode.ExtensionContext) {
	console.log('NebulusDB extension is now active!');

	// Command: Create NebulusDB configuration file
	const createConfigCommand = vscode.commands.registerCommand('nebulusdb-vscode.createConfig', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;
		const configPath = path.join(rootPath, 'nebulus.config.ts');

		// Check if file already exists
		if (fs.existsSync(configPath)) {
			const overwrite = await vscode.window.showWarningMessage(
				'NebulusDB configuration file already exists. Overwrite?',
				'Yes',
				'No'
			);
			if (overwrite !== 'Yes') {
				return;
			}
		}

		// Create the configuration file
		fs.writeFileSync(configPath, nebulusConfigTemplate);

		// Open the file in the editor
		const document = await vscode.workspace.openTextDocument(configPath);
		await vscode.window.showTextDocument(document);

		vscode.window.showInformationMessage('NebulusDB configuration file created successfully!');
	});

	// Command: Initialize NebulusDB project
	const initProjectCommand = vscode.commands.registerCommand('nebulusdb-vscode.initializeProject', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;
		const configPath = path.join(rootPath, 'nebulus.config.ts');
		const dbPath = path.join(rootPath, 'db.ts');

		// Create config file if it doesn't exist
		if (!fs.existsSync(configPath)) {
			fs.writeFileSync(configPath, nebulusConfigTemplate);
			vscode.window.showInformationMessage('Created NebulusDB configuration file.');
		}

		// Create db initialization file
		fs.writeFileSync(dbPath, projectInitTemplate);

		// Open the file in the editor
		const document = await vscode.workspace.openTextDocument(dbPath);
		await vscode.window.showTextDocument(document);

		vscode.window.showInformationMessage('NebulusDB project initialized successfully!');
	});

	// Command: Open NebulusDB documentation
	const showDocsCommand = vscode.commands.registerCommand('nebulusdb-vscode.showDocs', () => {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/Nom-nom-hub/NebulusDB'));
	});

	context.subscriptions.push(createConfigCommand);
	context.subscriptions.push(initProjectCommand);
	context.subscriptions.push(showDocsCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
