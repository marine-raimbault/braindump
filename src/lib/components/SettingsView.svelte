<script>
	import { testConnection, initRepo, isConfigured as ghConfigured } from '$lib/github.js';
	import { isConfigured as aiConfigured } from '$lib/classifier.js';
	import { loadEntries, lastSync } from '$lib/stores/entries.js';

	let ghToken = $state(localStorage.getItem('bd_github_token') || '');
	let ghRepo = $state(localStorage.getItem('bd_github_repo') || '');
	let aiKey = $state(localStorage.getItem('bd_anthropic_key') || '');

	let ghStatus = $state(ghConfigured() ? 'saved' : 'none'); // none | testing | ok | error | saved
	let ghError = $state('');
	let ghInfo = $state('');

	let aiStatus = $state(aiConfigured() ? 'saved' : 'none');
	let syncing = $state(false);

	async function testGithub() {
		localStorage.setItem('bd_github_token', ghToken.trim());
		localStorage.setItem('bd_github_repo', ghRepo.trim());
		ghStatus = 'testing';
		ghError = '';

		const result = await testConnection();
		if (result.ok) {
			ghStatus = 'ok';
			ghInfo = `Connected to ${result.repoName} (${result.private ? 'private' : 'public'})`;
			await initRepo();
		} else {
			ghStatus = 'error';
			ghError = result.error;
		}
	}

	function saveAnthropicKey() {
		localStorage.setItem('bd_anthropic_key', aiKey.trim());
		aiStatus = 'saved';
	}

	async function syncNow() {
		syncing = true;
		await loadEntries();
		syncing = false;
	}

	function formatTime(ts) {
		if (!ts) return 'never';
		return new Date(ts).toLocaleTimeString();
	}
</script>

<div class="settings">
	<div class="inner">
		<h2 class="title">setup</h2>
		<p class="subtitle">Connect your GitHub repo and Anthropic API key. Both stored locally in your browser only — never sent anywhere except their respective APIs.</p>

		<!-- GitHub -->
		<div class="section">
			<div class="section-head">
				<span class="section-icon">⊞</span>
				<span>GitHub Repository</span>
				{#if ghStatus === 'ok' || ghStatus === 'saved'}
					<span class="status-dot ok"></span>
				{:else if ghStatus === 'error'}
					<span class="status-dot err"></span>
				{/if}
			</div>

			<label class="field">
				<span class="field-label">Repo (username/repo-name)</span>
				<input
					type="text"
					bind:value={ghRepo}
					placeholder="yourname/braindump-data"
				/>
			</label>

			<label class="field">
				<span class="field-label">
					Personal Access Token
					<a href="https://github.com/settings/tokens/new?scopes=repo&description=braindump" target="_blank" class="field-link">
						generate one →
					</a>
				</span>
				<input
					type="password"
					bind:value={ghToken}
					placeholder="ghp_..."
				/>
			</label>

			<div class="actions">
				<button class="btn" onclick={testGithub} disabled={!ghToken || !ghRepo || ghStatus === 'testing'}>
					{ghStatus === 'testing' ? 'testing...' : 'connect'}
				</button>
				{#if ghStatus === 'ok' || ghStatus === 'saved'}
					<button class="btn secondary" onclick={syncNow} disabled={syncing}>
						{syncing ? 'syncing...' : 'sync now'}
					</button>
				{/if}
			</div>

			{#if ghInfo}
				<div class="msg ok">{ghInfo}</div>
			{/if}
			{#if ghError}
				<div class="msg err">{ghError}</div>
			{/if}
			{#if $lastSync}
				<div class="msg muted">Last sync: {formatTime($lastSync)}</div>
			{/if}
		</div>

		<!-- Anthropic -->
		<div class="section">
			<div class="section-head">
				<span class="section-icon">✦</span>
				<span>Anthropic API Key</span>
				{#if aiStatus === 'saved'}
					<span class="status-dot ok"></span>
				{/if}
			</div>
			<p class="section-note">
				Used for auto-classifying your dumps and generating training questions. Without it, entries save as raw notes (no AI features).
			</p>

			<label class="field">
				<span class="field-label">
					API Key
					<a href="https://console.anthropic.com/settings/keys" target="_blank" class="field-link">
						get one →
					</a>
				</span>
				<input
					type="password"
					bind:value={aiKey}
					placeholder="sk-ant-..."
				/>
			</label>

			<button class="btn" onclick={saveAnthropicKey} disabled={!aiKey}>
				{aiStatus === 'saved' ? 'saved ✓' : 'save'}
			</button>
		</div>

		<!-- How it works -->
		<div class="section info">
			<div class="section-head">
				<span class="section-icon">◈</span>
				<span>How it works</span>
			</div>
			<div class="how">
				<p><strong>1.</strong> Create a private GitHub repo (e.g. <code>braindump-data</code>)</p>
				<p><strong>2.</strong> Generate a Personal Access Token with <code>repo</code> scope</p>
				<p><strong>3.</strong> Paste both above and hit connect</p>
				<p><strong>4.</strong> Every dump becomes a markdown file in your repo</p>
				<p><strong>5.</strong> Your data is always yours — plain text, version-controlled, browsable on GitHub</p>
			</div>
		</div>
	</div>
</div>

<style>
	.settings {
		flex: 1;
		overflow-y: auto;
		padding: 1.2rem;
	}
	.inner {
		max-width: 520px;
		margin: 0 auto;
	}
	.title {
		font-size: 1rem;
		font-weight: 600;
		opacity: 0.8;
		margin-bottom: 0.3rem;
	}
	.subtitle {
		font-size: 0.72rem;
		opacity: 0.35;
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}
	.section {
		background: var(--bg-surface);
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 0.8rem;
		border: 1px solid var(--border);
	}
	.section.info { background: transparent; border-style: dashed; }
	.section-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		font-weight: 500;
		margin-bottom: 0.7rem;
	}
	.section-icon { opacity: 0.3; }
	.section-note {
		font-size: 0.68rem;
		opacity: 0.35;
		line-height: 1.5;
		margin-bottom: 0.7rem;
	}
	.field {
		display: block;
		margin-bottom: 0.6rem;
	}
	.field-label {
		display: flex;
		justify-content: space-between;
		font-size: 0.65rem;
		opacity: 0.4;
		margin-bottom: 0.25rem;
		letter-spacing: 0.03em;
	}
	.field-link {
		color: var(--pine);
		text-decoration: none;
		opacity: 0.7;
	}
	.field-link:hover { opacity: 1; }
	input {
		width: 100%;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		color: var(--text);
		font-size: 0.78rem;
		outline: none;
		font-family: inherit;
	}
	input:focus { border-color: var(--border-hl); }
	input::placeholder { color: var(--text-subtle); opacity: 0.3; }
	.actions {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.2rem;
	}
	.btn {
		background: var(--bg-overlay);
		border: 1px solid var(--border-hl);
		color: var(--text);
		padding: 7px 16px;
		border-radius: 6px;
		font-size: 0.72rem;
		transition: all 0.15s;
		letter-spacing: 0.03em;
	}
	.btn:hover:not(:disabled) { background: var(--border-hl); }
	.btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.btn.secondary {
		background: transparent;
		border-color: var(--border);
	}
	.msg {
		font-size: 0.68rem;
		margin-top: 0.5rem;
		line-height: 1.4;
	}
	.msg.ok { color: var(--green); opacity: 0.7; }
	.msg.err { color: var(--rose); opacity: 0.7; }
	.msg.muted { opacity: 0.25; }
	.status-dot {
		width: 6px; height: 6px;
		border-radius: 50%;
		margin-left: auto;
	}
	.status-dot.ok { background: var(--green); }
	.status-dot.err { background: var(--rose); }
	.how p {
		font-size: 0.72rem;
		opacity: 0.4;
		line-height: 1.7;
		margin-bottom: 0.15rem;
	}
	.how code {
		background: var(--bg-overlay);
		padding: 1px 4px;
		border-radius: 3px;
		font-size: 0.68rem;
	}
	.how strong { opacity: 0.6; }
</style>
