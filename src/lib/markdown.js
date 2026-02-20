/**
 * Parse markdown with YAML frontmatter into { meta, body }
 * No dependencies - handles what we need.
 *
 * File format:
 * ---
 * id: abc123
 * category: command
 * title: Select active users
 * tags: [sql, postgres]
 * trainable: true
 * training_q: How do you query active users?
 * reviews: 3
 * lastReview: 2026-02-20T10:00:00Z
 * created: 2026-02-20T09:00:00Z
 * ---
 *
 * SELECT * FROM users WHERE active = true
 */

export function parseEntry(filename, content) {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) {
		return { id: filename, text: content, category: 'raw', title: filename, tags: [], trainable: false, training_q: null, reviews: 0, lastReview: null, created: Date.now() };
	}

	const meta = parseYaml(match[1]);
	const body = match[2].trim();

	return {
		id: meta.id || filename.replace('.md', ''),
		category: meta.category || 'raw',
		domain: meta.domain || 'daily',
		title: meta.title || body.slice(0, 40),
		tags: meta.tags || [],
		summary: meta.summary || '',
		trainable: meta.trainable === true || meta.trainable === 'true',
		training_q: meta.training_q || null,
		reviews: parseInt(meta.reviews) || 0,
		lastReview: meta.lastReview ? new Date(meta.lastReview).getTime() : null,
		created: meta.created ? new Date(meta.created).getTime() : Date.now(),
		text: body
	};
}

export function serializeEntry(entry) {
	const lines = [
		'---',
		`id: ${entry.id}`,
		`category: ${entry.category}`,
		`domain: ${entry.domain || 'daily'}`,
		`title: "${entry.title.replace(/"/g, '\\"')}"`,
		`tags: [${entry.tags.map(t => t).join(', ')}]`,
		`trainable: ${entry.trainable}`,
	];

	if (entry.training_q) {
		lines.push(`training_q: "${entry.training_q.replace(/"/g, '\\"')}"`);
	}
	if (entry.summary) {
		lines.push(`summary: "${entry.summary.replace(/"/g, '\\"')}"`);
	}

	lines.push(`reviews: ${entry.reviews}`);

	if (entry.lastReview) {
		lines.push(`lastReview: ${new Date(entry.lastReview).toISOString()}`);
	}

	lines.push(`created: ${new Date(entry.created).toISOString()}`);
	lines.push('---');
	lines.push('');
	lines.push(entry.text);

	return lines.join('\n');
}

export function entryToFilename(entry) {
	return `${entry.id}.md`;
}

// Minimal YAML parser for our frontmatter (handles strings, numbers, booleans, arrays)
function parseYaml(text) {
	const result = {};
	for (const line of text.split('\n')) {
		const match = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
		if (!match) continue;

		const key = match[1];
		let val = match[2].trim();

		// Array: [a, b, c]
		if (val.startsWith('[') && val.endsWith(']')) {
			val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
		}
		// Quoted string
		else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		// Boolean
		else if (val === 'true') val = true;
		else if (val === 'false') val = false;
		else if (val === 'null') val = null;
		// Number
		else if (!isNaN(val) && val !== '') val = Number(val);

		result[key] = val;
	}
	return result;
}
