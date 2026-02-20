// Register for daily coaching - stores user config in KV
export async function onRequestPost(context) {
	const { oderId, telegramToken, chatId, githubToken, githubRepo, timezone } = await context.request.json();

	if (!chatId || !telegramToken || !githubToken || !githubRepo) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Use chatId as the unique user key
	const userKey = `user:${chatId}`;

	const userData = {
		oderId,
		telegramToken,
		chatId,
		githubToken,
		githubRepo,
		timezone: timezone || 'Europe/Berlin',
		registeredAt: new Date().toISOString(),
		active: true
	};

	try {
		await context.env.USERS.put(userKey, JSON.stringify(userData));

		// Send confirmation via Telegram
		await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: `🧠 *Daily coaching activated!*\n\nYou'll receive personalized coaching every morning based on your braindump entries.\n\nTopics: learning, goals, patterns, motivation.`,
				parse_mode: 'Markdown'
			})
		});

		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(JSON.stringify({ error: e.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// Unregister from daily coaching
export async function onRequestDelete(context) {
	const { chatId } = await context.request.json();

	if (!chatId) {
		return new Response(JSON.stringify({ error: 'Missing chatId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		await context.env.USERS.delete(`user:${chatId}`);
		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(JSON.stringify({ error: e.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
