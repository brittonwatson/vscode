/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const SUBSTRATE_PATH = path.join(os.homedir(), '.telos', 'repo');

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('telos.openSubstrate', openSubstrate),
		vscode.commands.registerCommand('telos.runAgent', runAgentPlaceholder),
		vscode.commands.registerCommand('telos.signIn', signInPlaceholder),
		vscode.commands.registerCommand('telos.signOut', signOutPlaceholder),
	);

	// Register placeholder views so the activity-bar container has
	// something to show. Real content (agent branches, briefings) will
	// arrive once the runtime is wired in.
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider(
			'telos.agentDrafts',
			new PlaceholderTreeProvider('No drafts yet. Press ⌘. in the editor.'),
		),
		vscode.window.registerTreeDataProvider(
			'telos.briefings',
			new PlaceholderTreeProvider('No briefings yet.'),
		),
	);

	// On first launch with no folder open, drop the user into their
	// substrate. This is what makes Telos feel like an app for one's
	// own work, not a generic editor.
	if (vscode.workspace.workspaceFolders === undefined) {
		void maybeOpenSubstrateOnLaunch();
	}
}

export function deactivate(): void {
	// no-op
}

async function maybeOpenSubstrateOnLaunch(): Promise<void> {
	if (!fs.existsSync(SUBSTRATE_PATH)) {
		// Substrate doesn't exist yet — wait for the user to sign in
		// (which will create it). The Telos extension's own sign-in
		// flow handles initialization.
		return;
	}
	await vscode.commands.executeCommand(
		'vscode.openFolder',
		vscode.Uri.file(SUBSTRATE_PATH),
		{ forceNewWindow: false },
	);
}

async function openSubstrate(): Promise<void> {
	if (!fs.existsSync(SUBSTRATE_PATH)) {
		void vscode.window.showWarningMessage(
			'Substrate not found. Sign in first to create it.',
		);
		return;
	}
	await vscode.commands.executeCommand(
		'vscode.openFolder',
		vscode.Uri.file(SUBSTRATE_PATH),
	);
}

async function runAgentPlaceholder(): Promise<void> {
	void vscode.window.showInformationMessage(
		'Telos agent — wiring coming next session. The keybinding works.',
	);
}

async function signInPlaceholder(): Promise<void> {
	void vscode.window.showInformationMessage(
		'Telos sign-in — wiring coming next session. Will open the magic-link flow.',
	);
}

async function signOutPlaceholder(): Promise<void> {
	void vscode.window.showInformationMessage('Telos sign-out — coming next session.');
}

class PlaceholderTreeProvider implements vscode.TreeDataProvider<string> {
	constructor(private readonly message: string) { }

	getTreeItem(element: string): vscode.TreeItem {
		const item = new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
		item.description = '';
		return item;
	}

	getChildren(): string[] {
		return [this.message];
	}
}
