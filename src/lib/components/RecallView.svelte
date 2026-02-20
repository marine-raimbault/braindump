<script>
	import { entries } from '$lib/stores/entries.js';

	let search = $state('');
	let filter = $state(null);
	let searchEl;

	const CATEGORIES = {
		command: { label: 'Command', icon: '⌘', color: 'var(--gold)' },
		concept: { label: 'Concept', icon: '◈', color: 'var(--foam)' },
		insight: { label: 'Insight', icon: '✦', color: 'var(--iris)' },
		task:    { label: 'Task',    icon: '◻', color: 'var(--orange)' },
		question:{ label: 'Question',icon: '?', color: 'var(--rose)' },
		reference:{ label: 'Ref',    icon: '⊞', color: 'var(--pine)' },
		raw:     { label: 'Note',    icon: '·', color: 'var(--text-subtle)' },
	};

	let catCounts = $derived(
		$entries.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {})
	);

	let filtered = $derived(
		$entries
			.filter(e => {
				const q = search.toLowerCase();
				const matchSearch = !q ||
					e.text.toLowerCase().includes(q) ||
					e.title?.toLowerCase().includes(q) ||
					e.tags?.some(t => t.toLowerCase().includes(q));
				const matchFilter = !filter || e.category === filter;
				return matchSearch && matchFilter;
			})
			.sort((a, b) => b.created - a.created)
	);

	function timeAgo(ts) {
		const d = Date.now() - ts;
		const m = Math.floor(d / 60000);
		if (m < 1) return 'now';
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h`;
		const days = Math.floor(h / 24);
		if (days < 30) return `${days}d`;
		return `${Math.floor(days / 30)}mo`;
	}

	$effect(() => { searchEl?.focus(); });
</script>

<div class="recall">
	<div class="search-bar">
		<input
			bind:this={searchEl}
			bind:value={search}
			placeholder="search your brain..."
		/>
	</div>

	<div class="filters">
		<button class="f-btn" class:active={!filter} onclick={() => filter = null}>
			All ({$entries.length})
		</button>
		{#each Object.entries(CATEGORIES) as [key, cat]}
			{#if catCounts[key]}
				<button
					class="f-btn"
					class:active={filter === key}
					onclick={() => filter = filter === key ? null : key}
					style={filter === key ? `background: ${cat.color}18; color: ${cat.color}; border-color: ${cat.color}35` : ''}
				>
					{cat.icon} {cat.label} ({catCounts[key]})
				</button>
			{/if}
		{/each}
	</div>

	<div class="results">
		{#if filtered.length === 0}
			<div class="empty">
				{$entries.length === 0 ? 'Nothing here yet. Go dump.' : 'No matches.'}
			</div>
		{/if}
		{#each filtered as entry (entry.id)}
			{@const cat = CATEGORIES[entry.category] || CATEGORIES.raw}
			<div class="result" style="border-left: 2px solid {cat.color}30">
				<div class="r-head">
					<span class="r-badge" style="background: {cat.color}12; color: {cat.color}">
						{cat.icon} {entry.title}
					</span>
					<span class="r-time">{timeAgo(entry.created)}</span>
				</div>
				<pre class="r-text">{entry.text}</pre>
				{#if entry.tags?.length}
					<div class="r-tags">
						{#each entry.tags as tag}
							<button class="r-tag" onclick={() => { search = tag; filter = null; }}>{tag}</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.recall {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.search-bar {
		padding: 0.8rem 1rem 0.4rem;
		flex-shrink: 0;
	}
	input {
		width: 100%;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 9px;
		padding: 0.55rem 0.85rem;
		color: var(--text);
		font-size: 0.82rem;
		outline: none;
	}
	input:focus { border-color: var(--border-hl); }
	input::placeholder { color: var(--text-subtle); opacity: 0.4; }
	.filters {
		display: flex;
		gap: 0.3rem;
		padding: 0.3rem 1rem;
		flex-wrap: wrap;
		flex-shrink: 0;
	}
	.f-btn {
		background: none;
		border: 1px solid var(--border);
		color: var(--text);
		padding: 3px 8px;
		border-radius: 5px;
		font-size: 0.6rem;
		opacity: 0.35;
		transition: all 0.15s;
		letter-spacing: 0.03em;
	}
	.f-btn:hover { opacity: 0.6; }
	.f-btn.active { opacity: 1; background: var(--bg-overlay); border-color: var(--border-hl); }
	.results {
		flex: 1;
		overflow-y: auto;
		padding: 0.4rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.3;
		font-size: 0.8rem;
	}
	.result {
		background: var(--bg-surface);
		border-radius: 7px;
		padding: 0.65rem 0.85rem;
	}
	.r-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}
	.r-badge {
		font-size: 0.6rem;
		padding: 1px 6px;
		border-radius: 3px;
	}
	.r-time { font-size: 0.58rem; opacity: 0.25; }
	.r-text {
		font-size: 0.75rem;
		line-height: 1.55;
		opacity: 0.55;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: inherit;
		margin: 0.2rem 0 0;
	}
	.r-tags {
		display: flex;
		gap: 0.25rem;
		margin-top: 0.35rem;
		flex-wrap: wrap;
	}
	.r-tag {
		font-size: 0.52rem;
		padding: 1px 5px;
		border-radius: 3px;
		background: var(--bg-overlay);
		border: none;
		color: var(--text);
		opacity: 0.5;
		cursor: pointer;
	}
	.r-tag:hover { opacity: 0.8; }
</style>
