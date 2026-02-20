/**
 * GitHub API client for braindump.
 *
 * Uses the GitHub Contents API to read/write individual markdown files
 * to a private repo. Each entry = one .md file in /entries/
 *
 * Auth: Personal Access Token (classic) with `repo` scope.
 * Stored in localStorage, never committed anywhere.
 */

const API = 'https://api.github.com';
const ENTRIES_PATH = 'entries';

function getConfig() {
	const token = localStorage.getItem('bd_github_token');
	const repo = localStorage.getItem('bd_github_repo'); // format: "username/repo-name"
	return { token, repo };
}

function headers(token) {
	return {
		'Authorization': `Bearer ${token}`,
		'Accept': 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
}

/**
 * Test connection - verifies token and repo access
 */
export async function testConnection() {
	const { token, repo } = getConfig();
	if (!token || !repo) return { ok: false, error: 'Missing token or repo' };

	try {
		const res = await fetch(`${API}/repos/${repo}`, { headers: headers(token) });
		if (res.ok) {
			const data = await res.json();
			return { ok: true, repoName: data.full_name, private: data.private };
		}
		if (res.status === 404) return { ok: false, error: 'Repo not found. Check the name or make sure the token has access.' };
		if (res.status === 401) return { ok: false, error: 'Bad token. Generate a new one.' };
		return { ok: false, error: `GitHub returned ${res.status}` };
	} catch (e) {
		return { ok: false, error: `Network error: ${e.message}` };
	}
}

/**
 * Initialize repo - create entries/ directory if it doesn't exist
 */
export async function initRepo() {
	const { token, repo } = getConfig();
	if (!token || !repo) return;

	try {
		const res = await fetch(`${API}/repos/${repo}/contents/${ENTRIES_PATH}`, { headers: headers(token) });
		if (res.status === 404) {
			// Create a .gitkeep to initialize the directory
			await fetch(`${API}/repos/${repo}/contents/${ENTRIES_PATH}/.gitkeep`, {
				method: 'PUT',
				headers: headers(token),
				body: JSON.stringify({
					message: 'init braindump entries',
					content: btoa('')
				})
			});
		}
	} catch (e) {
		console.error('Failed to init repo:', e);
	}
}

/**
 * Fetch all entries from the repo
 * Returns array of { filename, content } objects
 */
export async function fetchAllEntries() {
	const { token, repo } = getConfig();
	if (!token || !repo) return [];

	try {
		// List all files in entries/
		const res = await fetch(`${API}/repos/${repo}/contents/${ENTRIES_PATH}`, { headers: headers(token) });
		if (!res.ok) return [];

		const files = await res.json();
		const mdFiles = files.filter(f => f.name.endsWith('.md'));

		// Fetch each file's content (in parallel, batched)
		const entries = await Promise.all(
			mdFiles.map(async (file) => {
				try {
					const r = await fetch(file.url, { headers: headers(token) });
					const data = await r.json();
					const content = atob(data.content.replace(/\n/g, ''));
					return { filename: file.name, content, sha: data.sha };
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

/**
 * Save a single entry (create or update)
 */
export async function saveEntry(filename, content, existingSha = null) {
	const { token, repo } = getConfig();
	if (!token || !repo) throw new Error('Not configured');

	const path = `${ENTRIES_PATH}/${filename}`;
	const body = {
		message: existingSha ? `update ${filename}` : `add ${filename}`,
		content: btoa(unescape(encodeURIComponent(content))) // handle unicode
	};

	// If updating, we need the current SHA
	if (existingSha) {
		body.sha = existingSha;
	} else {
		// Check if file already exists (to get SHA for update)
		try {
			const check = await fetch(`${API}/repos/${repo}/contents/${path}`, { headers: headers(token) });
			if (check.ok) {
				const data = await check.json();
				body.sha = data.sha;
				body.message = `update ${filename}`;
			}
		} catch {
			// File doesn't exist, that's fine
		}
	}

	const res = await fetch(`${API}/repos/${repo}/contents/${path}`, {
		method: 'PUT',
		headers: headers(token),
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message || `GitHub API error ${res.status}`);
	}

	const data = await res.json();
	return data.content.sha; // Return new SHA for future updates
}

/**
 * Delete an entry
 */
export async function deleteEntry(filename, sha) {
	const { token, repo } = getConfig();
	if (!token || !repo) throw new Error('Not configured');

	const path = `${ENTRIES_PATH}/${filename}`;

	// Get SHA if not provided
	if (!sha) {
		const check = await fetch(`${API}/repos/${repo}/contents/${path}`, { headers: headers(token) });
		if (!check.ok) return;
		const data = await check.json();
		sha = data.sha;
	}

	await fetch(`${API}/repos/${repo}/contents/${path}`, {
		method: 'DELETE',
		headers: headers(token),
		body: JSON.stringify({
			message: `remove ${filename}`,
			sha
		})
	});
}

export function isConfigured() {
	const { token, repo } = getConfig();
	return !!(token && repo);
}

export function getRepoUrl() {
	const { repo } = getConfig();
	return repo ? `https://github.com/${repo}` : null;
}
