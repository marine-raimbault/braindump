// Cloudflare Pages Function - Generate and send learning digest via Telegram
export async function onRequestPost(context) {
	const { telegramToken, chatId, entries } = await context.request.json();

	if (!telegramToken || !chatId || !entries?.length) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Get trainable entries for context
	const trainable = entries.filter(e => e.trainable);
	const topics = [...new Set(trainable.flatMap(e => e.tags || []))].slice(0, 10);
	const categories = [...new Set(trainable.map(e => e.category))];

	if (topics.length === 0) {
		return new Response(JSON.stringify({ error: 'No topics to search for' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Generate digest using AI
	const prompt = `You are a learning assistant. Based on these topics the user is learning: ${topics.join(', ')}

Categories they're interested in: ${categories.join(', ')}

Recent entries they've saved:
${trainable.slice(0, 5).map(e => `- ${e.title}: ${e.text.slice(0, 100)}`).join('\n')}

Write a short, helpful digest (max 500 chars) with:
1. One interesting fact or tip related to their topics
2. One suggestion for what to explore next
3. A motivational note about their learning progress

Keep it casual and friendly. Use 1-2 relevant emojis.`;

	try {
		const aiResponse = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 300
		});

		const digestText = aiResponse.response;

		// Send via Telegram
		const telegramRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: `🧠 *Braindump Digest*\n\n${digestText}`,
				parse_mode: 'Markdown'
			})
		});

		const telegramData = await telegramRes.json();

		if (!telegramData.ok) {
			throw new Error(telegramData.description || 'Telegram API error');
		}

		return new Response(JSON.stringify({ success: true, digest: digestText }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(JSON.stringify({ error: e.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
