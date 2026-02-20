<script>
	import { entries, addEntry } from '$lib/stores/entries.js';
	import { classifyEntry, isConfigured as aiConfigured } from '$lib/classifier.js';

	let text = $state('');
	let processing = $state(false);
	let inputEl;

	const CATEGORIES = {
		command: { label: 'Command', icon: '⌘', color: 'var(--gold)' },
		concept: { label: 'Concept', icon: '◈', color: 'var(--foam)' },
		insight: { label: 'Insight', icon: '✦', color: 'var(--iris)' },
		task:    { label: 'Task',    icon: '◻', color: 'var(--orange)' },
		question:{ label: 'Question',icon: '?', color: 'var(--rose)' },
		reference:{ label: 'Ref',    icon: '⊞', color: 'var(--pine)' },
		raw:     { label: 'Note',    icon: '·', color: 'var(--text-subtle)' },
	};

	const MASTERY = [
		{ label: 'New', min: 0, color: 'var(--bg-overlay)' },
		{ label: 'Seen', min: 1, color: 'var(--rose)' },
		{ label: 'Learning', min: 3, color: 'var(--orange)' },
		{ label: 'Familiar', min: 5, color: 'var(--gold)' },
		{ label: 'Known', min: 8, color: 'var(--pine)' },
		{ label: 'Mastered', min: 12, color: 'var(--green)' },
	];

	function getMastery(reviews) {
		let level = MASTERY[0];
		for (const l of MASTERY) if (reviews >= l.min) level = l;
		return level;
	}

	function timeAgo(ts) {
		const d = Date.now() - ts;
		const m = Math.floor(d / 60000);
		if (m < 1) return 'now';
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h`;
		const days = Math.floor(h / 24);
		return `${days}d`;
	}

	async function submit() {
		const trimmed = text.trim();
		if (!trimmed || processing) return;
		text = '';
		processing = true;

		let meta;
		if (aiConfigured()) {
			meta = await classifyEntry(trimmed);
		} else {
			// Fallback: no AI, just save as raw
			meta = { category: 'raw', title: trimmed.slice(0, 40), tags: [], summary: '', trainable: false, training_q: null };
		}

		await addEntry({ text: trimmed, ...meta });
		processing = false;
		inputEl?.focus();
	}

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	function autoResize(e) {
		e.target.style.height = 'auto';
		e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
	}

	let reversed = $derived([...$entries].reverse().slice(0, 60));

	$effect(() => {
		inputEl?.focus();
	});
</script>

<div class="dump-view">
	<div class="feed">
		{#if reversed.length === 0}
			<div class="empty">
				<div class="empty-icon">◈</div>
				<div class="empty-text">
					Start typing. Anything.<br/>
					SQL queries, ideas, things you learned.<br/><br/>
					<span class="empty-sub">I'll organize it. You just dump.</span>
				</div>
			</div>
		{/if}
		{#each reversed as entry (entry.id)}
			{@const cat = CATEGORIES[entry.category] || CATEGORIES.raw}
			{@const mastery = getMastery(entry.reviews)}
			<div class="card" style="animation: fadeIn 0.3s ease">
				<div class="card-head">
					<span class="badge" style="background: {cat.color}15; color: {cat.color}">
						{cat.icon} {cat.label}
					</span>
					<span class="time">{timeAgo(entry.created)}</span>
				</div>
				<div class="card-title">{entry.title}</div>
				<div class="card-body">{entry.text}</div>
				{#if entry.tags?.length || entry.trainable}
					<div class="tags">
						{#each entry.tags || [] as tag}
							<span class="tag">{tag}</span>
						{/each}
						{#if entry.trainable}
							<span class="tag mastery" style="background: {mastery.color}18; color: {mastery.color}">
								{mastery.label}
							</span>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="input-area">
		{#if processing}
			<div class="processing"><div class="processing-fill"></div></div>
		{/if}
		<div class="input-wrap">
			<textarea
				bind:this={inputEl}
				bind:value={text}
				onkeydown={handleKeydown}
				oninput={autoResize}
				placeholder="dump anything..."
				rows="1"
			></textarea>
			<button
				class="send"
				onclick={submit}
				disabled={!text.trim() || processing}
				style="opacity: {text.trim() && !processing ? 1 : 0.15}"
			>↵</button>
		</div>
	</div>
</div>

<style>
	.dump-view {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.feed {
		flex: 1;
		overflow-y: auto;
		padding: 0.8rem 1rem;
		display: flex;
		flex-direction: column-reverse;
		gap: 0.4rem;
	}
	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.empty-icon { font-size: 2rem; opacity: 0.2; margin-bottom: 0.8rem; }
	.empty-text { opacity: 0.35; font-size: 0.8rem; line-height: 1.7; text-align: center; }
	.empty-sub { opacity: 0.5; }
	.card {
		background: var(--bg-surface);
		border-radius: 9px;
		padding: 0.75rem 0.9rem;
	}
	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.3rem;
	}
	.badge {
		font-size: 0.6rem;
		padding: 1px 7px;
		border-radius: 4px;
		letter-spacing: 0.04em;
	}
	.time { font-size: 0.6rem; opacity: 0.25; }
	.card-title {
		font-size: 0.78rem;
		font-weight: 600;
		opacity: 0.8;
		margin-bottom: 0.2rem;
	}
	.card-body {
		font-size: 0.75rem;
		line-height: 1.55;
		opacity: 0.45;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.tags {
		display: flex;
		gap: 0.3rem;
		margin-top: 0.4rem;
		flex-wrap: wrap;
	}
	.tag {
		font-size: 0.55rem;
		padding: 1px 5px;
		border-radius: 3px;
		background: var(--bg-overlay);
		opacity: 0.55;
	}
	.tag.mastery { opacity: 0.8; }

	.input-area {
		border-top: 1px solid var(--border);
		padding: 0.65rem 1rem;
		flex-shrink: 0;
	}
	.input-wrap {
		display: flex;
		align-items: flex-end;
		gap: 0.4rem;
		background: var(--bg-surface);
		border-radius: 10px;
		padding: 0.45rem 0.65rem;
		border: 1px solid var(--border);
	}
	.input-wrap:focus-within {
		border-color: var(--border-hl);
	}
	textarea {
		flex: 1;
		background: none;
		border: none;
		color: var(--text);
		font-size: 0.82rem;
		outline: none;
		resize: none;
		line-height: 1.5;
		min-height: 1.2rem;
		max-height: 150px;
	}
	textarea::placeholder { color: var(--text-subtle); opacity: 0.4; }
	.send {
		background: none;
		border: none;
		color: var(--text);
		font-size: 1rem;
		padding: 2px 4px;
		transition: opacity 0.2s;
		flex-shrink: 0;
	}
	.processing {
		height: 2px;
		background: var(--bg-overlay);
		border-radius: 1px;
		margin-bottom: 0.4rem;
		overflow: hidden;
	}
	.processing-fill {
		height: 100%;
		width: 50%;
		background: linear-gradient(90deg, var(--iris), var(--pine));
		border-radius: 1px;
		animation: shimmer 1.5s ease-in-out infinite;
	}
</style>
