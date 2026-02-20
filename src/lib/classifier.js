/**
 * AI classification - uses Anthropic if key provided, otherwise Cloudflare Workers AI (free)
 */

function getKey() {
	return import.meta.env.VITE_ANTHROPIC_KEY || localStorage.getItem('bd_anthropic_key');
}

async function callClaude(system, userMessage) {
	const key = getKey();
	if (!key) throw new Error('No Anthropic API key configured');

	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': key,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true'
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 500,
			system,
			messages: [{ role: 'user', content: userMessage }]
		})
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error?.message || `API error ${res.status}`);
	}

	const data = await res.json();
	return data.content[0].text;
}

/**
 * Classify using Cloudflare Workers AI (free)
 */
async function classifyWithCloudflare(text) {
	const res = await fetch('/api/classify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text })
	});
	if (!res.ok) throw new Error('Cloudflare AI failed');
	return res.json();
}

/**
 * Generate hint using Cloudflare Workers AI (free)
 */
async function hintWithCloudflare(question, answer) {
	const res = await fetch('/api/hint', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ question, answer })
	});
	if (!res.ok) throw new Error('Cloudflare AI failed');
	const data = await res.json();
	return data.hint;
}

/**
 * Classify a raw dump into structured entry metadata
 * Uses Anthropic if configured, otherwise Cloudflare AI (free)
 */
export async function classifyEntry(text) {
	try {
		// Try Anthropic first if configured
		if (getKey()) {
			const raw = await callClaude(
				`You are a brain dump classifier. Given a note, return ONLY valid JSON (no markdown, no backticks, no explanation):
{"category":"command|concept|insight|task|question|reference|raw","domain":"daily|skills|goals|health|library","title":"short 3-6 word title","tags":["tag1","tag2"],"summary":"one sentence essence","trainable":true|false,"training_q":"a question to test recall"}

Rules:
- command: SQL, CLI, code snippets, terminal commands, API calls
- concept: definitions, explanations, how things work
- insight: realizations, connections, aha moments
- task: todos, reminders, action items
- question: things to look up, open questions
- reference: URLs, book titles, people, resources
- raw: everything else

Domain (which folder to store in):
- daily: random thoughts, quick notes, misc observations
- skills: learning something, technical knowledge, how-to, tutorials
- goals: objectives, OKRs, progress updates, milestones
- health: fitness, nutrition, sleep, workouts, mental health, sports
- library: book notes, article summaries, quotes, references

- trainable: true if worth reviewing later (commands, concepts, insights)
- training_q: if trainable, write a question that tests understanding/recall of this specific knowledge`,
				text
			);
			return JSON.parse(raw.replace(/```json|```/g, '').trim());
		}

		// Fallback to Cloudflare AI (free)
		return await classifyWithCloudflare(text);
	} catch (e) {
		console.error('Classification failed:', e);
		return {
			category: 'raw',
			domain: 'daily',
			title: text.slice(0, 40),
			tags: [],
			summary: text.slice(0, 100),
			trainable: false,
			training_q: null
		};
	}
}

/**
 * Generate a hint for a training card (doesn't give the answer)
 */
export async function generateHint(question, answer) {
	try {
		if (getKey()) {
			return await callClaude(
				'Give a short helpful hint (1 sentence max) to help someone remember this. Do NOT reveal the full answer.',
				`Question: ${question}\nAnswer from notes: ${answer}`
			);
		}
		return await hintWithCloudflare(question, answer);
	} catch {
		return 'Think about the context where you learned this...';
	}
}

// Always returns true now - Cloudflare AI is always available as fallback
export function isConfigured() {
	return true;
}
