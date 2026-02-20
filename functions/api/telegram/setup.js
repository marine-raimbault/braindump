// Set up Telegram webhook - call this once after deployment
// GET /api/telegram/setup?token=YOUR_BOT_TOKEN

export async function onRequestGet(context) {
	const url = new URL(context.request.url);
	const token = url.searchParams.get('token');

	if (!token) {
		return new Response(JSON.stringify({ error: 'Missing token parameter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const webhookUrl = `${url.origin}/api/telegram/webhook`;

	// Set the webhook
	const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			url: webhookUrl,
			allowed_updates: ['message', 'callback_query']
		})
	});

	const data = await res.json();

	if (data.ok) {
		return new Response(JSON.stringify({
			success: true,
			message: 'Webhook set!',
			webhook_url: webhookUrl
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} else {
		return new Response(JSON.stringify({
			success: false,
			error: data.description
		}), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
