// Telegram Bot Webhook - Interactive braindump via chat
// Commands: /dump, /train, /stats, /help
// Or just send any message to dump it

const GITHUB_API = 'https://api.github.com';

async function sendMessage(token, chatId, text, options = {}) {
	const body = {
		chat_id: chatId,
		text,
		parse_mode: 'Markdown',
		...options
	};

	await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function classifyText(ai, text) {
	const prompt = `You are a brain dump classifier. Given a note, return ONLY valid JSON:
{"category":"command|concept|insight|task|question|reference|raw","domain":"daily|skills|goals|health|library","title":"short 3-6 word title","tags":["tag1"],"trainable":true|false,"training_q":"question"}

Note: ${text}`;

	try {
		const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 300
		});
		return JSON.parse(response.response.replace(/```json|```/g, '').trim());
	} catch {
		return { category: 'raw', domain: 'daily', title: text.slice(0, 30), tags: [], trainable: false };
	}
}

async function saveToGithub(token, repo, entry) {
	const domain = entry.domain || 'daily';
	const filename = `${entry.id}.md`;
	const content = `---
id: ${entry.id}
category: ${entry.category}
domain: ${domain}
title: "${entry.title}"
tags: [${entry.tags.join(', ')}]
trainable: ${entry.trainable}
${entry.training_q ? `training_q: "${entry.training_q}"` : ''}
reviews: 0
created: ${new Date().toISOString()}
---

${entry.text}`;

	const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${domain}/${filename}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/vnd.github+json',
			'User-Agent': 'Braindump-Bot'
		},
		body: JSON.stringify({
			message: `add ${filename} via telegram`,
			content: btoa(unescape(encodeURIComponent(content)))
		})
	});

	return res.ok;
}

async function getRandomTrainable(ghToken, repo) {
	const domains = ['daily', 'skills', 'goals', 'health', 'library'];
	const trainable = [];

	for (const domain of domains) {
		try {
			const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${domain}`, {
				headers: {
					'Authorization': `Bearer ${ghToken}`,
					'Accept': 'application/vnd.github+json',
					'User-Agent': 'Braindump-Bot'
				}
			});
			if (!res.ok) continue;

			const files = await res.json();
			for (const file of files.filter(f => f.name.endsWith('.md'))) {
				const r = await fetch(file.url, {
					headers: {
						'Authorization': `Bearer ${ghToken}`,
						'Accept': 'application/vnd.github+json',
						'User-Agent': 'Braindump-Bot'
					}
				});
				const data = await r.json();
				const content = atob(data.content.replace(/\n/g, ''));

				if (content.includes('trainable: true') && content.includes('training_q:')) {
					const titleMatch = content.match(/title: "([^"]+)"/);
					const questionMatch = content.match(/training_q: "([^"]+)"/);
					const textMatch = content.match(/---\n\n([\s\S]+)$/);

					if (questionMatch) {
						trainable.push({
							title: titleMatch?.[1] || 'Entry',
							question: questionMatch[1],
							answer: textMatch?.[1]?.trim() || '',
							domain
						});
					}
				}
			}
		} catch (e) {
			console.error(`Error fetching ${domain}:`, e);
		}
	}

	if (trainable.length === 0) return null;
	return trainable[Math.floor(Math.random() * trainable.length)];
}

async function getStats(ghToken, repo) {
	const domains = ['daily', 'skills', 'goals', 'health', 'library'];
	const stats = { total: 0, byDomain: {} };

	for (const domain of domains) {
		try {
			const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${domain}`, {
				headers: {
					'Authorization': `Bearer ${ghToken}`,
					'Accept': 'application/vnd.github+json',
					'User-Agent': 'Braindump-Bot'
				}
			});
			if (!res.ok) continue;
			const files = await res.json();
			const count = files.filter(f => f.name.endsWith('.md')).length;
			stats.byDomain[domain] = count;
			stats.total += count;
		} catch {
			stats.byDomain[domain] = 0;
		}
	}

	return stats;
}

export async function onRequestPost(context) {
	const update = await context.request.json();
	const message = update.message;

	if (!message?.text || !message?.chat?.id) {
		return new Response('OK');
	}

	const chatId = message.chat.id;
	const text = message.text.trim();
	const firstName = message.from?.first_name || 'friend';

	// Get user config from KV
	const userKey = `user:${chatId}`;
	const userData = await context.env.USERS.get(userKey);

	if (!userData) {
		await sendMessage(
			context.env.BOT_TOKEN,
			chatId,
			`👋 Hey ${firstName}! I don't have you registered yet.\n\nGo to https://braindump-cxq.pages.dev and set up Telegram in settings, then enable daily coaching.\n\nOnce you're registered, you can:\n• Send me anything to dump it\n• /train - quick flashcard\n• /stats - your progress\n• /help - all commands`
		);
		return new Response('OK');
	}

	const user = JSON.parse(userData);
	const botToken = user.telegramToken;
	const ghToken = user.githubToken;
	const ghRepo = user.githubRepo;

	// Handle commands
	if (text.startsWith('/')) {
		const command = text.split(' ')[0].toLowerCase();

		if (command === '/start' || command === '/help') {
			await sendMessage(botToken, chatId, `🧠 *Braindump Bot*

Just send me anything and I'll classify & save it!

*Commands:*
/train - Random flashcard quiz
/stats - Your brain stats
/domains - What goes where
/help - This message

Or just type anything to dump it 💭`);
		}

		else if (command === '/train') {
			const card = await getRandomTrainable(ghToken, ghRepo);
			if (!card) {
				await sendMessage(botToken, chatId, `📚 No trainable entries yet!\n\nDump some knowledge first, and I'll create flashcards from it.`);
			} else {
				await sendMessage(botToken, chatId, `🎯 *Quick Train*\n\n📁 ${card.domain}\n\n*${card.question}*\n\n_Think about it, then tap below to see the answer..._`, {
					reply_markup: {
						inline_keyboard: [[
							{ text: '👀 Show Answer', callback_data: `answer:${Buffer.from(card.answer.slice(0, 200)).toString('base64').slice(0, 60)}` }
						]]
					}
				});
			}
		}

		else if (command === '/stats') {
			const stats = await getStats(ghToken, ghRepo);
			const domainLines = Object.entries(stats.byDomain)
				.filter(([_, count]) => count > 0)
				.map(([domain, count]) => {
					const emoji = { daily: '💭', skills: '🎯', goals: '🏆', health: '💪', library: '📚' }[domain] || '📁';
					return `${emoji} ${domain}: ${count}`;
				})
				.join('\n');

			await sendMessage(botToken, chatId, `📊 *Your Brain Stats*\n\n*Total entries:* ${stats.total}\n\n${domainLines || 'No entries yet!'}\n\n_Keep dumping! 🧠_`);
		}

		else if (command === '/domains') {
			await sendMessage(botToken, chatId, `📁 *Domain Guide*

💭 *daily* - random thoughts, quick notes
🎯 *skills* - learning, technical knowledge
🏆 *goals* - objectives, progress, milestones
💪 *health* - fitness, nutrition, sleep, sports
📚 *library* - book notes, articles, quotes

I auto-classify your dumps into the right folder!`);
		}

		else {
			await sendMessage(botToken, chatId, `🤔 Unknown command. Try /help`);
		}

		return new Response('OK');
	}

	// Regular message - treat as dump
	const classified = await classifyText(context.env.AI, text);

	const entry = {
		id: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
		text,
		...classified
	};

	const saved = await saveToGithub(ghToken, ghRepo, entry);

	const domainEmoji = { daily: '💭', skills: '🎯', goals: '🏆', health: '💪', library: '📚' }[entry.domain] || '📁';
	const categoryEmoji = { command: '⌘', concept: '◈', insight: '✦', task: '◻', question: '?', reference: '⊞', raw: '·' }[entry.category] || '·';

	if (saved) {
		let response = `${domainEmoji} *${entry.title}*\n\n${categoryEmoji} ${entry.category} → ${entry.domain}`;
		if (entry.tags?.length) {
			response += `\n🏷 ${entry.tags.join(', ')}`;
		}
		if (entry.trainable) {
			response += `\n\n✨ _Added to training!_`;
		}
		response += `\n\n✅ Saved!`;
		await sendMessage(botToken, chatId, response);
	} else {
		await sendMessage(botToken, chatId, `❌ Couldn't save. Check your GitHub token in settings.`);
	}

	return new Response('OK');
}

// Handle callback queries (inline button presses)
export async function onRequestGet(context) {
	return new Response('Telegram webhook endpoint. Use POST.');
}
