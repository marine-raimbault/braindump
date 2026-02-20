// Handle Telegram callback queries (button presses)
export async function onRequestPost(context) {
	const update = await context.request.json();
	const callback = update.callback_query;

	if (!callback) {
		return new Response('OK');
	}

	const chatId = callback.message?.chat?.id;
	const messageId = callback.message?.message_id;
	const data = callback.data;

	// Get user config
	const userKey = `user:${chatId}`;
	const userData = await context.env.USERS.get(userKey);
	if (!userData) return new Response('OK');

	const user = JSON.parse(userData);
	const botToken = user.telegramToken;

	// Answer the callback to remove loading state
	await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ callback_query_id: callback.id })
	});

	// Handle answer reveal
	if (data.startsWith('answer:')) {
		const encodedAnswer = data.slice(7);
		let answer;
		try {
			answer = Buffer.from(encodedAnswer, 'base64').toString('utf8');
		} catch {
			answer = 'Could not decode answer';
		}

		// Edit the message to show the answer
		await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				message_id: messageId,
				text: `📖 *Answer:*\n\n${answer}\n\n_How did you do?_`,
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [[
						{ text: '😅 Forgot', callback_data: 'rate:0' },
						{ text: '🤔 Hard', callback_data: 'rate:1' },
						{ text: '✨ Easy', callback_data: 'rate:2' }
					]]
				}
			})
		});
	}

	// Handle rating
	else if (data.startsWith('rate:')) {
		const rating = parseInt(data.slice(5));
		const responses = [
			"No worries! You'll get it next time 💪",
			"Good effort! Keep practicing 🎯",
			"Awesome! You're mastering this! 🌟"
		];

		await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				message_id: messageId,
				text: `${responses[rating]}\n\n/train for another card!`,
				parse_mode: 'Markdown'
			})
		});
	}

	return new Response('OK');
}
