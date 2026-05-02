/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const SUBSTRATE_PATH = path.join(os.homedir(), '.telos', 'repo');

/**
 * The Telos home view — a full editor-pane webview that opens by
 * default and is the first thing the user sees. The room you walk
 * into. Greeting, briefing placeholder, agent input, and a path
 * back to recent work. VS Code is the engine; this surface is
 * fully Telos-native.
 */
export class TelosHome {
	private static current: vscode.WebviewPanel | undefined;

	static show(context: vscode.ExtensionContext): void {
		if (TelosHome.current) {
			TelosHome.current.reveal(vscode.ViewColumn.Active, false);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'telos.home',
			'Home',
			{ viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			},
		);

		panel.webview.html = render(panel.webview);

		panel.onDidDispose(
			() => {
				TelosHome.current = undefined;
			},
			null,
			context.subscriptions,
		);

		panel.webview.onDidReceiveMessage(
			async (msg: { type?: string; rel?: string; instruction?: string }) => {
				if (msg.type === 'open' && typeof msg.rel === 'string') {
					const abs = path.join(SUBSTRATE_PATH, msg.rel);
					await vscode.commands.executeCommand(
						'vscode.open',
						vscode.Uri.file(abs),
					);
				} else if (msg.type === 'runAgent') {
					await vscode.commands.executeCommand('telos.runAgent');
				}
			},
			undefined,
			context.subscriptions,
		);

		TelosHome.current = panel;
	}
}

function render(_webview: vscode.Webview): string {
	const nonce = makeNonce();
	const greeting = greetingForNow();
	const date = dateForNow();

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}';" />
<title>Telos</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;450;500;600&display=swap" rel="stylesheet" />
<style>
:root {
	--telos-serif: 'Fraunces', 'Iowan Old Style', Georgia, serif;
	--telos-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
	--telos-mono: 'JetBrains Mono', ui-monospace, monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
	height: 100%;
	background: var(--vscode-editor-background);
	color: var(--vscode-editor-foreground);
	font-family: var(--telos-sans);
	font-size: 14px;
	line-height: 1.6;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	overflow: hidden;
}

::selection {
	background: var(--vscode-editor-selectionBackground);
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }

.shell {
	height: 100vh;
	display: grid;
	grid-template-rows: 1fr auto;
	overflow: hidden;
	position: relative;
}

.vignette {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.20) 100%);
	z-index: 1;
}

.scroll {
	overflow-y: auto;
	padding: 80px 0 24px;
	position: relative;
	z-index: 2;
}

.content {
	max-width: 720px;
	margin: 0 auto;
	padding: 0 56px;
	display: flex;
	flex-direction: column;
	gap: 56px;
}

.greeting-block {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.greeting {
	font-family: var(--telos-serif);
	font-variation-settings: 'opsz' 36;
	font-size: 32px;
	font-weight: 400;
	letter-spacing: -0.018em;
	color: var(--vscode-editor-foreground);
}

.greeting em {
	font-style: italic;
	font-weight: 300;
	opacity: 0.78;
}

.date {
	font-family: var(--telos-mono);
	font-size: 11px;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: var(--vscode-descriptionForeground);
}

.briefing {
	font-family: var(--telos-serif);
	font-variation-settings: 'opsz' 14;
	font-size: 16px;
	line-height: 1.75;
	letter-spacing: -0.005em;
	color: var(--vscode-editor-foreground);
	opacity: 0.92;
}

.briefing p { margin-bottom: 12px; }
.briefing p:last-child { margin-bottom: 0; }
.briefing .muted { opacity: 0.72; }

.briefing .placeholder {
	font-style: italic;
	opacity: 0.5;
}

.context {
	display: flex;
	flex-wrap: wrap;
	gap: 28px;
	padding: 18px 0;
	border-top: 1px solid var(--vscode-panel-border);
	border-bottom: 1px solid var(--vscode-panel-border);
}

.context-item {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.context-label {
	font-family: var(--telos-mono);
	font-size: 9.5px;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--vscode-descriptionForeground);
	opacity: 0.7;
}

.context-value {
	font-family: var(--telos-serif);
	font-variation-settings: 'opsz' 14;
	font-size: 13px;
	letter-spacing: -0.005em;
	color: var(--vscode-editor-foreground);
	opacity: 0.85;
}

.composer {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.composer-input {
	width: 100%;
	min-height: 110px;
	padding: 22px 24px;
	background: var(--vscode-editorWidget-background);
	border: 1px solid var(--vscode-panel-border);
	border-radius: 8px;
	color: var(--vscode-editor-foreground);
	font-family: var(--telos-serif);
	font-variation-settings: 'opsz' 14;
	font-size: 16px;
	line-height: 1.6;
	letter-spacing: -0.003em;
	resize: none;
	outline: none;
	transition: border-color 220ms ease, background 220ms ease;
}

.composer-input::placeholder {
	color: var(--vscode-input-placeholderForeground);
	opacity: 0.6;
	font-style: italic;
}

.composer-input:focus {
	border-color: var(--vscode-focusBorder);
}

.composer-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.suggestion-row {
	display: flex;
	gap: 8px;
}

.suggestion {
	background: transparent;
	border: 1px solid var(--vscode-panel-border);
	border-radius: 999px;
	padding: 6px 14px;
	font-family: var(--telos-sans);
	font-size: 12px;
	color: var(--vscode-foreground);
	opacity: 0.78;
	cursor: pointer;
	transition: opacity 160ms ease, border-color 160ms ease;
}

.suggestion:hover { opacity: 1; border-color: var(--vscode-focusBorder); }

.composer-hint {
	font-family: var(--telos-mono);
	font-size: 10px;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: var(--vscode-descriptionForeground);
	opacity: 0.55;
}

.section-title {
	font-family: var(--telos-mono);
	font-size: 10px;
	font-weight: 500;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--vscode-descriptionForeground);
	opacity: 0.65;
	margin-bottom: 12px;
}

.in-flight {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.in-flight-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 16px;
	padding: 8px 0;
	background: transparent;
	border: none;
	width: 100%;
	text-align: left;
	color: inherit;
	cursor: pointer;
	font: inherit;
	border-radius: 4px;
}

.in-flight-row:hover { color: var(--vscode-textLink-activeForeground); }

.in-flight-label {
	font-family: var(--telos-serif);
	font-variation-settings: 'opsz' 14;
	font-size: 14px;
	letter-spacing: -0.005em;
}

.in-flight-meta {
	font-family: var(--telos-mono);
	font-size: 10px;
	letter-spacing: 0.06em;
	color: var(--vscode-descriptionForeground);
	opacity: 0.6;
	flex-shrink: 0;
}

.footer {
	padding: 12px 56px 16px;
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	font-family: var(--telos-mono);
	font-size: 10px;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--vscode-descriptionForeground);
	opacity: 0.55;
	position: relative;
	z-index: 2;
}

.footer-key {
	font-family: var(--telos-mono);
	letter-spacing: 0.06em;
	text-transform: none;
}
</style>
</head>
<body>
<div class="shell">
	<div class="vignette"></div>
	<div class="scroll">
		<div class="content">
			<header class="greeting-block">
				<h1 class="greeting">${greeting}, <em>Britton</em>.</h1>
				<span class="date">${date}</span>
			</header>

			<section class="briefing">
				<p class="placeholder">
					This is where your morning briefing will live — what you've slept,
					what the day holds, who's waiting on you, what the agent has
					drafted while you were elsewhere. Pastoral, never managerial.
				</p>
				<p class="placeholder muted">
					The briefing prose lands once the briefing agent does (Phase 5).
					For now: a placeholder so you can see the shape.
				</p>
			</section>

			<section class="context">
				<div class="context-item">
					<span class="context-label">substrate</span>
					<span class="context-value">~/.telos/repo</span>
				</div>
				<div class="context-item">
					<span class="context-label">mode</span>
					<span class="context-value">coding · ⌥⌘W to flip</span>
				</div>
				<div class="context-item">
					<span class="context-label">agent</span>
					<span class="context-value">idle</span>
				</div>
			</section>

			<section class="composer">
				<textarea id="composer" class="composer-input" rows="3" placeholder="Plan, build, ask. ⏎ to send. / for commands. @ for context."></textarea>
				<div class="composer-actions">
					<div class="suggestion-row">
						<button class="suggestion" data-suggest="continue">Continue something</button>
						<button class="suggestion" data-suggest="newNote">New note</button>
						<button class="suggestion" data-suggest="briefMe">Brief me</button>
					</div>
					<span class="composer-hint">⌘. anywhere · ⌥⌘W modes · ⌥⌘H home</span>
				</div>
			</section>

			<section>
				<div class="section-title">In flight</div>
				<div class="in-flight">
					<button class="in-flight-row" data-open="notes/welcome.md">
						<span class="in-flight-label">Welcome</span>
						<span class="in-flight-meta">notes/welcome.md</span>
					</button>
					<button class="in-flight-row" data-open=".telos/user-model.md">
						<span class="in-flight-label">User model</span>
						<span class="in-flight-meta">.telos/user-model.md</span>
					</button>
				</div>
			</section>
		</div>
	</div>

	<div class="footer">
		<span>telos</span>
		<span class="footer-key">${formatTime()}</span>
	</div>
</div>

<script nonce="${nonce}">
	const vscode = acquireVsCodeApi();

	document.querySelectorAll('[data-open]').forEach((el) => {
		el.addEventListener('click', () => {
			const rel = el.getAttribute('data-open');
			vscode.postMessage({ type: 'open', rel: rel });
		});
	});

	document.querySelectorAll('[data-suggest]').forEach((el) => {
		el.addEventListener('click', () => {
			vscode.postMessage({ type: 'runAgent' });
		});
	});

	const composer = document.getElementById('composer');
	composer.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			vscode.postMessage({ type: 'runAgent', instruction: composer.value });
			composer.value = '';
		}
	});

</script>
</body>
</html>`;
}

function greetingForNow(): string {
	const h = new Date().getHours();
	if (h < 5) {
		return 'Up late';
	}
	if (h < 12) {
		return 'Good morning';
	}
	if (h < 17) {
		return 'Good afternoon';
	}
	if (h < 21) {
		return 'Good evening';
	}
	return 'Late evening';
}

function dateForNow(): string {
	const now = new Date();
	const day = now.toLocaleDateString('en-US', { weekday: 'long' });
	const md = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
	return `${day} · ${md}`;
}

function formatTime(): string {
	return new Date().toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: false,
	});
}

function makeNonce(): string {
	return Array.from({ length: 32 }, () =>
		Math.floor(Math.random() * 36).toString(36),
	).join('');
}
