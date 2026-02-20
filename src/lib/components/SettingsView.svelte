<script>
	import { testConnection, initRepo, isConfigured as ghConfigured } from '$lib/github.js';
	import { loadEntries, lastSync, entries } from '$lib/stores/entries.js';

	let ghToken = $state(localStorage.getItem('bd_github_token') || '');
	let ghRepo = $state(localStorage.getItem('bd_github_repo') || '');
	let aiKey = $state(localStorage.getItem('bd_anthropic_key') || '');
	let tgToken = $state(localStorage.getItem('bd_telegram_token') || '');
	let tgChatId = $state(localStorage.getItem('bd_telegram_chat_id') || '');

	let ghStatus = $state(ghConfigured() ? 'saved' : 'none');
	let ghError = $state('');
	let ghInfo = $state('');

	let tgStatus = $state(tgToken && tgChatId ? 'saved' : 'none');
	let tgError = $state('');
	let tgSending = $state(false);

	let syncing = $state(false);

	let activeAI = $derived(aiKey ? 'anthropic' : 'cloudflare');

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
	}

	function clearAnthropicKey() {
		aiKey = '';
		localStorage.removeItem('bd_anthropic_key');
	}

	function saveTelegram() {
		localStorage.setItem('bd_telegram_token', tgToken.trim());
		localStorage.setItem('bd_telegram_chat_id', tgChatId.trim());
		tgStatus = tgToken && tgChatId ? 'saved' : 'none';
	}

	async function testTelegram() {
		if (!tgToken || !tgChatId) return;
		tgStatus = 'testing';
		tgError = '';

		try {
			const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: tgChatId,
					text: '✅ Braindump connected!'
				})
			});
			const data = await res.json();
			if (data.ok) {
				tgStatus = 'ok';
				saveTelegram();
			} else {
				tgStatus = 'error';
				tgError = data.description || 'Failed to send';
			}
		} catch (e) {
			tgStatus = 'error';
			tgError = e.message;
		}
	}

	async function sendDigest() {
		if (!tgToken || !tgChatId) return;
		tgSending = true;
		tgError = '';

		try {
			const res = await fetch('/api/digest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					telegramToken: tgToken,
					chatId: tgChatId,
					entries: $entries
				})
			});
			const data = await res.json();
			if (data.error) {
				tgError = data.error;
			}
		} catch (e) {
			tgError = e.message;
		} finally {
			tgSending = false;
		}
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
		<p class="subtitle">Connect your GitHub repo to save entries. AI classification is free via Cloudflare.</p>

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

		<!-- AI Provider -->
		<div class="section">
			<div class="section-head">
				<span class="section-icon">✦</span>
				<span>AI Classification</span>
				<span class="status-dot ok"></span>
			</div>

			<div class="ai-status">
				<div class="ai-provider" class:active={activeAI === 'cloudflare'}>
					<span class="ai-icon">☁</span>
					<div class="ai-info">
						<span class="ai-name">Cloudflare AI</span>
						<span class="ai-model">Llama 3.1 · Free</span>
					</div>
					{#if activeAI === 'cloudflare'}
						<span class="ai-badge active">active</span>
					{/if}
				</div>

				<div class="ai-provider" class:active={activeAI === 'anthropic'}>
					<span class="ai-icon">◈</span>
					<div class="ai-info">
						<span class="ai-name">Anthropic</span>
						<span class="ai-model">Claude Sonnet · Paid</span>
					</div>
					{#if activeAI === 'anthropic'}
						<span class="ai-badge active">active</span>
					{:else}
						<span class="ai-badge">optional</span>
					{/if}
				</div>
			</div>

			<div class="ai-upgrade">
				<p class="section-note">
					{#if activeAI === 'cloudflare'}
						Using free Cloudflare AI. Add Anthropic key for better classification quality.
					{:else}
						Using Anthropic Claude for premium classification.
					{/if}
				</p>

				<label class="field">
					<span class="field-label">
						Anthropic API Key (optional)
						<a href="https://console.anthropic.com/settings/keys" target="_blank" class="field-link">
							get one →
						</a>
					</span>
					<input
						type="password"
						bind:value={aiKey}
						placeholder="sk-ant-..."
						oninput={saveAnthropicKey}
					/>
				</label>

				{#if aiKey}
					<button class="btn secondary small" onclick={clearAnthropicKey}>
						use free Cloudflare AI instead
					</button>
				{/if}
			</div>
		</div>

		<!-- Telegram -->
		<div class="section">
			<div class="section-head">
				<span class="section-icon">✈</span>
				<span>Telegram Digest</span>
				{#if tgStatus === 'ok' || tgStatus === 'saved'}
					<span class="status-dot ok"></span>
				{:else if tgStatus === 'error'}
					<span class="status-dot err"></span>
				{/if}
			</div>

			<p class="section-note">
				Get AI-generated learning digests sent to Telegram based on your entries.
			</p>

			<label class="field">
				<span class="field-label">
					Bot Token
					<a href="https://t.me/botfather" target="_blank" class="field-link">
						create bot →
					</a>
				</span>
				<input
					type="password"
					bind:value={tgToken}
					placeholder="123456789:ABC..."
					oninput={saveTelegram}
				/>
			</label>

			<label class="field">
				<span class="field-label">
					Chat ID
					<span class="field-hint">(send /start to your bot, then use @userinfobot)</span>
				</span>
				<input
					type="text"
					bind:value={tgChatId}
					placeholder="123456789"
					oninput={saveTelegram}
				/>
			</label>

			<div class="actions">
				<button class="btn" onclick={testTelegram} disabled={!tgToken || !tgChatId || tgStatus === 'testing'}>
					{tgStatus === 'testing' ? 'testing...' : 'test connection'}
				</button>
				{#if tgStatus === 'ok' || tgStatus === 'saved'}
					<button class="btn secondary" onclick={sendDigest} disabled={tgSending || $entries.length === 0}>
						{tgSending ? 'sending...' : 'send digest now'}
					</button>
				{/if}
			</div>

			{#if tgError}
				<div class="msg err">{tgError}</div>
			{/if}
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
				<p><strong>5.</strong> AI auto-classifies into categories with training questions</p>
				<p><strong>6.</strong> Optionally connect Telegram for learning digests</p>
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
	.field-hint {
		opacity: 0.6;
		font-size: 0.6rem;
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
	.btn.small {
		padding: 5px 10px;
		font-size: 0.65rem;
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

	/* AI Provider styles */
	.ai-status {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.8rem;
	}
	.ai-provider {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0.8rem;
		background: var(--bg);
		border-radius: 8px;
		border: 1px solid var(--border);
		opacity: 0.4;
		transition: all 0.2s;
	}
	.ai-provider.active {
		opacity: 1;
		border-color: var(--pine);
		background: #9ccfd808;
	}
	.ai-icon {
		font-size: 1.1rem;
		opacity: 0.5;
	}
	.ai-provider.active .ai-icon {
		opacity: 1;
	}
	.ai-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.ai-name {
		font-size: 0.75rem;
		font-weight: 500;
	}
	.ai-model {
		font-size: 0.6rem;
		opacity: 0.5;
	}
	.ai-badge {
		font-size: 0.55rem;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--bg-overlay);
		opacity: 0.5;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.ai-badge.active {
		background: #9ccfd820;
		color: var(--pine);
		opacity: 1;
	}
	.ai-upgrade {
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
	}
</style>
