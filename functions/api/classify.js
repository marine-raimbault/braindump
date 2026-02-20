// Cloudflare Pages Function - AI classification endpoint
export async function onRequestPost(context) {
	const { text } = await context.request.json();

	if (!text) {
		return new Response(JSON.stringify({ error: 'No text provided' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const prompt = `You are a brain dump classifier. Given a note, return ONLY valid JSON (no markdown, no backticks):
{"category":"command|concept|insight|task|question|reference|raw","title":"short 3-6 word title","tags":["tag1","tag2"],"summary":"one sentence","trainable":true|false,"training_q":"question to test recall"}

Rules:
- command: SQL, CLI, code snippets, terminal commands
- concept: definitions, explanations, how things work
- insight: realizations, aha moments
- task: todos, reminders
- question: things to look up
- reference: URLs, books, resources
- raw: everything else
- trainable: true if worth reviewing (commands, concepts, insights)
- training_q: if trainable, question that tests recall

Note to classify:
${text}`;

	try {
		const response = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 500
		});

		const raw = response.response;
		const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

		return new Response(JSON.stringify(parsed), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(JSON.stringify({
			category: 'raw',
			title: text.slice(0, 40),
			tags: [],
			summary: text.slice(0, 100),
			trainable: false,
			training_q: null
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
