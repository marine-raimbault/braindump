<script>
	import { onMount } from 'svelte';
	import Nav from '$lib/components/Nav.svelte';
	import DumpView from '$lib/components/DumpView.svelte';
	import RecallView from '$lib/components/RecallView.svelte';
	import TrainView from '$lib/components/TrainView.svelte';
	import SettingsView from '$lib/components/SettingsView.svelte';
	import { loadEntries, loading } from '$lib/stores/entries.js';
	import { isConfigured as ghConfigured } from '$lib/github.js';

	let view = $state('dump');
	let ready = $state(false);

	onMount(async () => {
		// If GitHub is configured, load entries on startup
		if (ghConfigured()) {
			await loadEntries();
		} else {
			// First time — show settings
			view = 'settings';
		}
		ready = true;
	});

	function navigate(v) {
		view = v;
	}
</script>

<div class="app">
	{#if !ready}
		<div class="loading">
			<span class="loading-icon">◈</span>
			{#if $loading}
				<span class="loading-text">syncing with github...</span>
			{/if}
		</div>
	{:else}
		<Nav {view} onNavigate={navigate} />
		<main>
			{#if view === 'dump'}
				<DumpView />
			{:else if view === 'recall'}
				<RecallView />
			{:else if view === 'train'}
				<TrainView />
			{:else if view === 'settings'}
				<SettingsView />
			{/if}
		</main>
	{/if}
</div>

<style>
	.app {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.loading {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
	}
	.loading-icon {
		font-size: 1.8rem;
		opacity: 0.2;
		animation: pulse 1.5s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 0.1; }
		50% { opacity: 0.3; }
	}
	.loading-text {
		font-size: 0.72rem;
		opacity: 0.25;
	}
</style>
