// Send daily coaching to all registered users
// Call this endpoint via cron service (e.g., cron-job.org) at 7 AM

const GITHUB_API = 'https://api.github.com';

async function fetchUserEntries(token, repo) {
	const headers = {
		'Authorization': `Bearer ${token}`,
		'Accept': 'application/vnd.github+json',
		'User-Agent': 'Braindump-Coaching'
	};

	try {
		const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/entries`, { headers });
		if (!res.ok) return [];

		const files = await res.json();
		const mdFiles = files.filter(f => f.name.endsWith('.md')).slice(-20); // Last 20 entries

		const entries = await Promise.all(
			mdFiles.map(async (file) => {
				try {
					const r = await fetch(file.url, { headers });
					const data = await r.json();
					const content = atob(data.content.replace(/\n/g, ''));
					return parseEntry(content);
				} catch {
					return null;
				}
			})
		);

		return entries.filter(Boolean);
	} catch (e) {
		console.error('Failed to fetch entries:', e);
		return [];
	}
}

function parseEntry(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return { text: content, tags: [], category: 'raw' };

	const meta = {};
	for (const line of match[1].split('\n')) {
		const m = line.match(/^(\w+)\s*:\s*(.*)$/);
		if (m) {
			let val = m[2].trim();
			if (val.startsWith('[') && val.endsWith(']')) {
				val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
			} else if (val.startsWith('"') && val.endsWith('"')) {
				val = val.slice(1, -1);
			}
			meta[m[1]] = val;
		}
	}

	return {
		title: meta.title || '',
		text: match[2].trim(),
		tags: meta.tags || [],
		category: meta.category || 'raw',
		trainable: meta.trainable === 'true' || meta.trainable === true
	};
}

async function generateCoaching(ai, entries) {
	const trainable = entries.filter(e => e.trainable);
	const topics = [...new Set(trainable.flatMap(e => e.tags || []))].slice(0, 15);
	const categories = [...new Set(entries.map(e => e.category))];

	const recentTitles = entries.slice(-10).map(e => e.title).filter(Boolean);

	const prompt = `You are a personal growth coach. Based on this person's recent brain dumps:

Topics they're learning: ${topics.join(', ') || 'various topics'}
Categories: ${categories.join(', ')}
Recent entries: ${recentTitles.join(', ')}

Sample entries:
${trainable.slice(-3).map(e => `- ${e.title}: ${e.text.slice(0, 150)}`).join('\n')}

Write a short morning coaching message (max 400 chars) that:
1. Acknowledges their recent learning/progress
2. Gives one actionable tip for today
3. Asks a reflection question

Be warm, specific to their topics, and motivating. Use 1-2 emojis.`;

	try {
		const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 250
		});
		return response.response;
	} catch (e) {
		return "🌅 Good morning! Take a moment to reflect on what you learned yesterday. What's one thing you want to focus on today?";
	}
}

export async function onRequestPost(context) {
	// Optional: Add a secret key to prevent unauthorized triggers
	const authHeader = context.request.headers.get('X-Cron-Secret');
	const cronSecret = context.env.CRON_SECRET;

	if (cronSecret && authHeader !== cronSecret) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const results = { sent: 0, failed: 0, errors: [] };

	try {
		// List all registered users
		const userList = await context.env.USERS.list({ prefix: 'user:' });

		for (const key of userList.keys) {
			try {
				const userData = JSON.parse(await context.env.USERS.get(key.name));

				if (!userData.active) continue;

				// Fetch user's entries
				const entries = await fetchUserEntries(userData.githubToken, userData.githubRepo);

				if (entries.length === 0) {
					results.failed++;
					results.errors.push(`${key.name}: no entries`);
					continue;
				}

				// Generate personalized coaching
				const coaching = await generateCoaching(context.env.AI, entries);

				// Send via Telegram
				const tgRes = await fetch(`https://api.telegram.org/bot${userData.telegramToken}/sendMessage`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						chat_id: userData.chatId,
						text: `🌅 *Morning Coaching*\n\n${coaching}`,
						parse_mode: 'Markdown'
					})
				});

				const tgData = await tgRes.json();

				if (tgData.ok) {
					results.sent++;
				} else {
					results.failed++;
					results.errors.push(`${key.name}: ${tgData.description}`);
				}
			} catch (e) {
				results.failed++;
				results.errors.push(`${key.name}: ${e.message}`);
			}
		}

		return new Response(JSON.stringify(results), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(JSON.stringify({ error: e.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// Also allow GET for easy testing
export async function onRequestGet(context) {
	return onRequestPost(context);
}
