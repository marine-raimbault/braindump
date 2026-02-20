<script>
	import { stats, syncing } from '$lib/stores/entries.js';
	import { getRepoUrl } from '$lib/github.js';

	let { view = 'dump', onNavigate } = $props();

	const tabs = [
		{ id: 'dump', label: 'dump' },
		{ id: 'recall', label: 'recall' },
		{ id: 'train', label: 'train' },
	];

	let repoUrl = $derived(getRepoUrl());
</script>

<nav class="nav">
	<div class="logo">
		<span class="logo-icon">◈</span>
		braindump
		{#if $syncing}
			<span class="sync-dot"></span>
		{/if}
	</div>

	<div class="tabs">
		{#each tabs as tab}
			<button
				class="tab"
				class:active={view === tab.id}
				onclick={() => onNavigate(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<div class="right">
		{#if repoUrl}
			<a href={repoUrl} target="_blank" class="repo-link" title="View on GitHub">⊞</a>
		{/if}
		<button class="settings-btn" onclick={() => onNavigate('settings')} class:active={view === 'settings'}>⚙</button>
		<span class="count">{$stats.total}</span>
	</div>
</nav>

<style>
	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.7rem 1.2rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.logo {
		font-size: 0.82rem;
		font-weight: 600;
		opacity: 0.7;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.logo-icon { opacity: 0.3; }
	.sync-dot {
		width: 5px; height: 5px;
		border-radius: 50%;
		background: var(--pine);
		animation: pulse 1s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}
	.tabs {
		display: flex;
		gap: 2px;
		background: var(--bg-surface);
		border-radius: 7px;
		padding: 3px;
	}
	.tab {
		background: none;
		border: none;
		color: var(--text);
		padding: 5px 14px;
		border-radius: 5px;
		font-size: 0.72rem;
		opacity: 0.35;
		transition: all 0.2s;
		letter-spacing: 0.04em;
	}
	.tab:hover { opacity: 0.6; }
	.tab.active {
		opacity: 1;
		background: var(--bg-overlay);
	}
	.right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.count {
		font-size: 0.65rem;
		opacity: 0.25;
	}
	.settings-btn, .repo-link {
		background: none;
		border: none;
		color: var(--text);
		font-size: 0.8rem;
		opacity: 0.25;
		transition: opacity 0.2s;
		text-decoration: none;
	}
	.settings-btn:hover, .repo-link:hover { opacity: 0.6; }
	.settings-btn.active { opacity: 0.8; }
</style>
