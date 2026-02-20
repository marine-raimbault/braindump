<script>
	import { entries, trainableEntries, stats, updateEntry } from '$lib/stores/entries.js';
	import { generateHint, isConfigured as aiConfigured } from '$lib/classifier.js';

	const MASTERY = [
		{ label: 'New',      min: 0,  color: 'var(--bg-overlay)' },
		{ label: 'Seen',     min: 1,  color: 'var(--rose)' },
		{ label: 'Learning', min: 3,  color: 'var(--orange)' },
		{ label: 'Familiar', min: 5,  color: 'var(--gold)' },
		{ label: 'Known',    min: 8,  color: 'var(--pine)' },
		{ label: 'Mastered', min: 12, color: 'var(--green)' },
	];

	function getMastery(reviews) {
		let level = MASTERY[0];
		for (const l of MASTERY) if (reviews >= l.min) level = l;
		return level;
	}

	let queue = $state([]);
	let current = $state(null);
	let phase = $state('idle'); // idle | question | hint | answer
	let hint = $state('');
	let loadingHint = $state(false);
	let sessionDone = $state(0);
	let sessionTotal = $state(0);

	let masteryDist = $derived(() => {
		const d = {};
		for (const l of MASTERY) d[l.label] = 0;
		for (const e of $trainableEntries) {
			d[getMastery(e.reviews).label]++;
		}
		return d;
	});

	let mastered = $derived($trainableEntries.filter(e => e.reviews >= 12).length);

	function startSession() {
		// Spaced repetition sort: fewer reviews + older = higher priority
		const sorted = [...$trainableEntries].sort((a, b) => {
			const sa = a.reviews * 2 - (a.lastReview ? (Date.now() - a.lastReview) / 3600000 : 100);
			const sb = b.reviews * 2 - (b.lastReview ? (Date.now() - b.lastReview) / 3600000 : 100);
			return sa - sb;
		});

		const items = sorted.slice(0, Math.min(10, sorted.length));
		queue = items.slice(1);
		current = items[0] || null;
		phase = current ? 'question' : 'idle';
		sessionDone = 0;
		sessionTotal = items.length;
		hint = '';
	}

	async function showHint() {
		if (!current) return;
		loadingHint = true;
		if (aiConfigured()) {
			hint = await generateHint(current.training_q, current.text);
		} else {
			hint = 'Think about when you last used this...';
		}
		phase = 'hint';
		loadingHint = false;
	}

	function showAnswer() { phase = 'answer'; }

	function rate(quality) {
		// 0 = forgot, 1 = hard, 2 = easy
		const updated = {
			...current,
			reviews: current.reviews + (quality > 0 ? 1 : 0),
			lastReview: Date.now()
		};
		updateEntry(updated);
		sessionDone++;

		if (quality === 0) {
			queue = [...queue, current]; // put back
		}

		if (queue.length > 0) {
			current = queue[0];
			queue = queue.slice(1);
			phase = 'question';
			hint = '';
		} else {
			current = null;
			phase = 'idle';
		}
	}
</script>

<div class="train">
	<!-- Progress -->
	<div class="header">
		<div class="progress-section">
			<div class="progress-label">
				<span class="label-muted">Knowledge Mastery</span>
				<span class="label-count">{mastered}/{$trainableEntries.length} mastered</span>
			</div>
			<div class="progress-bar">
				{#each MASTERY as level}
					{@const count = masteryDist()[level.label] || 0}
					{@const pct = $trainableEntries.length > 0 ? (count / $trainableEntries.length) * 100 : 0}
					{#if pct > 0}
						<div style="height:100%; width:{pct}%; background:{level.color}; transition:width 0.4s"></div>
					{/if}
				{/each}
			</div>
			<div class="legend">
				{#each MASTERY as l}
					<span class="legend-item">
						<span class="legend-dot" style="background: {l.color}"></span>
						{l.label} ({masteryDist()[l.label] || 0})
					</span>
				{/each}
			</div>
		</div>

		<div class="stat-row">
			<div class="stat">
				<div class="stat-n">{$stats.total}</div>
				<div class="stat-l">dumps</div>
			</div>
			<div class="stat">
				<div class="stat-n">{$stats.totalReviews}</div>
				<div class="stat-l">reviews</div>
			</div>
			<div class="stat">
				<div class="stat-n">{$stats.trainable}</div>
				<div class="stat-l">trainable</div>
			</div>
		</div>
	</div>

	<!-- Training area -->
	<div class="area">
		{#if phase === 'idle'}
			<div class="idle">
				{#if $trainableEntries.length === 0}
					<div class="idle-icon">◈</div>
					<div class="idle-text">
						Nothing to train yet.<br/>
						Dump some knowledge first.
					</div>
				{:else if sessionDone > 0}
					<div class="idle-icon">✦</div>
					<div class="idle-done">Session complete. {sessionDone} reviewed.</div>
					<button class="start-btn" onclick={startSession}>train again</button>
				{:else}
					<div class="idle-icon dim">◈</div>
					<div class="idle-count">{$trainableEntries.length} items ready</div>
					<button class="start-btn" onclick={startSession}>start training</button>
				{/if}
			</div>
		{:else if current}
			<div class="card-area">
				<!-- Session bar -->
				<div class="session-bar">
					<div class="session-fill" style="width: {sessionTotal > 0 ? (sessionDone / sessionTotal) * 100 : 0}%"></div>
				</div>
				<div class="session-count">{sessionDone + 1} / {sessionTotal + queue.length + 1}</div>

				<!-- Flashcard -->
				<div class="card">
					<div class="card-cat">{current.title}</div>
					<div class="card-q">{current.training_q}</div>

					{#if phase === 'hint' && hint}
						<div class="card-hint">
							<span class="card-label">hint</span>
							{hint}
						</div>
					{/if}

					{#if phase === 'answer'}
						<div class="card-answer">
							<span class="card-label">your note</span>
							<pre class="card-answer-text">{current.text}</pre>
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="actions">
					{#if phase === 'question'}
						<button class="hint-btn" onclick={showHint} disabled={loadingHint}>
							{loadingHint ? '...' : 'hint'}
						</button>
						<button class="reveal-btn" onclick={showAnswer}>show answer</button>
					{:else if phase === 'hint'}
						<button class="reveal-btn" onclick={showAnswer}>show answer</button>
					{:else if phase === 'answer'}
						<div class="rating">
							<button class="rate-btn forgot" onclick={() => rate(0)}>forgot</button>
							<button class="rate-btn hard" onclick={() => rate(1)}>hard</button>
							<button class="rate-btn easy" onclick={() => rate(2)}>easy</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.train {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: auto;
	}
	.header {
		padding: 1.1rem 1.2rem 0.9rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.progress-label {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.4rem;
	}
	.label-muted { opacity: 0.4; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; }
	.label-count { font-size: 0.78rem; }
	.progress-bar {
		height: 5px;
		background: var(--bg-overlay);
		border-radius: 3px;
		display: flex;
		overflow: hidden;
		margin-bottom: 0.45rem;
	}
	.legend {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 3px;
		font-size: 0.55rem;
		opacity: 0.45;
	}
	.legend-dot {
		width: 5px; height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.stat-row {
		display: flex;
		gap: 1.5rem;
		margin-top: 0.8rem;
	}
	.stat-n { font-size: 1.3rem; font-weight: 700; opacity: 0.8; }
	.stat-l { font-size: 0.55rem; opacity: 0.25; text-transform: uppercase; letter-spacing: 0.1em; }

	.area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.2rem;
	}
	.idle {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.idle-icon { font-size: 2.2rem; margin-bottom: 0.8rem; }
	.idle-icon.dim { opacity: 0.2; }
	.idle-text { opacity: 0.35; font-size: 0.8rem; line-height: 1.7; text-align: center; }
	.idle-done { opacity: 0.5; font-size: 0.85rem; margin-bottom: 1.2rem; }
	.idle-count { opacity: 0.4; font-size: 0.8rem; margin-bottom: 1.2rem; }
	.start-btn {
		background: var(--bg-overlay);
		border: 1px solid var(--border-hl);
		color: var(--text);
		padding: 9px 24px;
		border-radius: 7px;
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		transition: all 0.2s;
	}
	.start-btn:hover { background: var(--border-hl); }

	.card-area { width: 100%; max-width: 480px; }
	.session-bar {
		height: 2px;
		background: var(--bg-overlay);
		border-radius: 1px;
		overflow: hidden;
		margin-bottom: 0.3rem;
	}
	.session-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--iris), var(--pine));
		transition: width 0.4s;
	}
	.session-count {
		opacity: 0.3;
		font-size: 0.62rem;
		text-align: center;
		margin-bottom: 1.2rem;
	}
	.card {
		background: var(--bg-surface);
		border-radius: 12px;
		padding: 1.3rem;
		min-height: 160px;
		border: 1px solid var(--border);
	}
	.card-cat {
		font-size: 0.6rem;
		opacity: 0.35;
		margin-bottom: 0.8rem;
		letter-spacing: 0.04em;
	}
	.card-q {
		font-size: 0.95rem;
		line-height: 1.55;
		font-weight: 500;
	}
	.card-label {
		display: block;
		opacity: 0.35;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.3rem;
	}
	.card-hint {
		margin-top: 1.1rem;
		padding: 0.65rem;
		background: #e8c54710;
		border-radius: 7px;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--gold);
	}
	.card-answer {
		margin-top: 1.1rem;
		padding: 0.65rem;
		background: #9ccfd810;
		border-radius: 7px;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--pine);
	}
	.card-answer-text {
		font-family: inherit;
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0;
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
		margin-top: 1.1rem;
	}
	.hint-btn {
		background: none;
		border: 1px solid #e8c54728;
		color: var(--gold);
		padding: 7px 18px;
		border-radius: 7px;
		font-size: 0.72rem;
	}
	.hint-btn:disabled { opacity: 0.4; }
	.reveal-btn {
		background: var(--bg-overlay);
		border: 1px solid var(--border-hl);
		color: var(--text);
		padding: 7px 18px;
		border-radius: 7px;
		font-size: 0.72rem;
	}
	.rating { display: flex; gap: 0.4rem; width: 100%; }
	.rate-btn {
		flex: 1;
		padding: 9px;
		border-radius: 7px;
		font-size: 0.72rem;
		border: 1px solid transparent;
	}
	.forgot { background: #eb6f9212; color: var(--rose); border-color: #eb6f9225; }
	.hard   { background: #f2a65a12; color: var(--orange); border-color: #f2a65a25; }
	.easy   { background: #a6da9512; color: var(--green); border-color: #a6da9525; }
	.rate-btn:hover { filter: brightness(1.2); }
</style>
