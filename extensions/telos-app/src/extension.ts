/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { TelosHome } from './home.js';

const SUBSTRATE_PATH = path.join(os.homedir(), '.telos', 'repo');
const MODE_KEY = 'telos.mode';

type TelosMode = 'writing' | 'coding';

/**
 * Settings flipped by `telos.toggleMode`. Each is applied at the
 * Global config target so it persists across all Telos windows. The
 * keys here are deliberately a small set — wide enough to make the
 * two modes feel distinct, narrow enough that the user can still
 * override individual values in their settings.
 */
const CODING_SETTINGS: Record<string, unknown> = {
	'editor.fontFamily': `'JetBrains Mono', ui-monospace, monospace`,
	'editor.fontSize': 14,
	'editor.lineHeight': 1.65,
	'editor.lineNumbers': 'on',
	'editor.padding.top': 32,
	'editor.padding.bottom': 32,
	'editor.wordWrap': 'on',
};

const WRITING_SETTINGS: Record<string, unknown> = {
	'editor.fontFamily': `'Fraunces', 'Iowan Old Style', Georgia, serif`,
	'editor.fontSize': 17,
	'editor.lineHeight': 1.75,
	'editor.lineNumbers': 'off',
	'editor.padding.top': 56,
	'editor.padding.bottom': 120,
	'editor.wordWrap': 'bounded',
	'editor.wordWrapColumn': 70,
};

let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('telos.openSubstrate', openSubstrate),
		vscode.commands.registerCommand('telos.runAgent', runAgentPlaceholder),
		vscode.commands.registerCommand('telos.signIn', signInPlaceholder),
		vscode.commands.registerCommand('telos.signOut', signOutPlaceholder),
		vscode.commands.registerCommand('telos.toggleMode', () => toggleMode(context)),
		vscode.commands.registerCommand('telos.setMode', (mode: TelosMode) => setMode(context, mode)),
		vscode.commands.registerCommand('telos.home', () => TelosHome.show(context)),
	);

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

	// Mode indicator: lowercase mono dot in the status bar. Click to
	// toggle. Tooltip surfaces the keybinding (⌥⌘W).
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	statusBarItem.command = 'telos.toggleMode';
	context.subscriptions.push(statusBarItem);
	updateStatusBar(currentMode(context));
	statusBarItem.show();

	// The fork is invoked by Telos as the editor surface; Telos's React
	// shell is the home now. The fork no longer auto-shows a Home view.
	// The Telos: Home command (⌥⌘H) is still available if a user wants
	// the in-fork Home for any reason, but the default is to leave the
	// editor as the editor.
}

export function deactivate(): void {
	// no-op
}

function currentMode(context: vscode.ExtensionContext): TelosMode {
	const stored = context.globalState.get<TelosMode>(MODE_KEY);
	return stored === 'writing' ? 'writing' : 'coding';
}

async function setMode(
	context: vscode.ExtensionContext,
	mode: TelosMode,
): Promise<void> {
	await context.globalState.update(MODE_KEY, mode);
	updateStatusBar(mode);

	const settings = mode === 'writing' ? WRITING_SETTINGS : CODING_SETTINGS;
	const config = vscode.workspace.getConfiguration();
	for (const [key, value] of Object.entries(settings)) {
		try {
			await config.update(key, value, vscode.ConfigurationTarget.Global);
		} catch {
			// Some keys (e.g. activityBar.location) require an active
			// workbench context. If they fail here, the user can re-toggle
			// once a window/workspace is fully initialized.
		}
	}
}

async function toggleMode(context: vscode.ExtensionContext): Promise<void> {
	const next: TelosMode = currentMode(context) === 'writing' ? 'coding' : 'writing';
	await setMode(context, next);
}

function updateStatusBar(mode: TelosMode): void {
	if (!statusBarItem) {
		return;
	}
	// Lowercase + leading dot keeps it quiet against the rest of the
	// status bar. Telos's voice is "matter-of-fact, not announcement."
	statusBarItem.text = `· ${mode}`;
	statusBarItem.tooltip = `Telos mode — click or press ⌥⌘W to toggle.`;
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
