// Cloudflare Pages Function - AI hint generation
export async function onRequestPost(context) {
	const { question, answer } = await context.request.json();

	if (!question || !answer) {
		return new Response(JSON.stringify({ error: 'Missing question or answer' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const prompt = `Give a short helpful hint (1 sentence max) to help someone remember this. Do NOT reveal the full answer.

Question: ${question}
Answer from notes: ${answer}`;

	try {
		const response = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 100
		});

		return new Response(JSON.stringify({ hint: response.response }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(JSON.stringify({ hint: 'Think about the context where you learned this...' }), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
