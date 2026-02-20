/**
 * GitHub API client for braindump.
 *
 * Uses the GitHub Contents API to read/write individual markdown files
 * to a private repo. Entries organized by domain folders:
 * - daily/   - quick dumps, random thoughts
 * - skills/  - learning, technical knowledge
 * - goals/   - OKRs, objectives, progress
 * - health/  - fitness, nutrition, sleep
 * - library/ - book notes, articles
 *
 * Auth: Personal Access Token (classic) with `repo` scope.
 * Stored in localStorage, never committed anywhere.
 */

const API = 'https://api.github.com';
const DOMAINS = ['daily', 'skills', 'goals', 'health', 'library'];

function getConfig() {
	const token = import.meta.env.VITE_GITHUB_TOKEN || localStorage.getItem('bd_github_token');
	const repo = import.meta.env.VITE_GITHUB_REPO || localStorage.getItem('bd_github_repo');
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
 * Initialize repo - create all domain folders if they don't exist
 */
export async function initRepo() {
	const { token, repo } = getConfig();
	if (!token || !repo) return;

	for (const domain of DOMAINS) {
		try {
			const res = await fetch(`${API}/repos/${repo}/contents/${domain}`, { headers: headers(token) });
			if (res.status === 404) {
				await fetch(`${API}/repos/${repo}/contents/${domain}/.gitkeep`, {
					method: 'PUT',
					headers: headers(token),
					body: JSON.stringify({
						message: `init ${domain} folder`,
						content: btoa('')
					})
				});
			}
		} catch (e) {
			console.error(`Failed to init ${domain}:`, e);
		}
	}
}

/**
 * Fetch all entries from all domain folders
 * Returns array of { filename, content, domain, sha } objects
 */
export async function fetchAllEntries() {
	const { token, repo } = getConfig();
	if (!token || !repo) return [];

	const allEntries = [];

	for (const domain of DOMAINS) {
		try {
			const res = await fetch(`${API}/repos/${repo}/contents/${domain}`, { headers: headers(token) });
			if (!res.ok) continue;

			const files = await res.json();
			const mdFiles = files.filter(f => f.name.endsWith('.md'));

			const entries = await Promise.all(
				mdFiles.map(async (file) => {
					try {
						const r = await fetch(file.url, { headers: headers(token) });
						const data = await r.json();
						const content = atob(data.content.replace(/\n/g, ''));
						return { filename: file.name, content, domain, sha: data.sha };
					} catch {
						return null;
					}
				})
			);

			allEntries.push(...entries.filter(Boolean));
		} catch (e) {
			console.error(`Failed to fetch ${domain}:`, e);
		}
	}

	return allEntries;
}

/**
 * Save a single entry to a domain folder (create or update)
 */
export async function saveEntry(filename, content, domain = 'daily', existingSha = null) {
	const { token, repo } = getConfig();
	if (!token || !repo) throw new Error('Not configured');

	// Validate domain
	if (!DOMAINS.includes(domain)) domain = 'daily';

	const path = `${domain}/${filename}`;
	const body = {
		message: existingSha ? `update ${filename}` : `add ${filename} to ${domain}`,
		content: btoa(unescape(encodeURIComponent(content)))
	};

	if (existingSha) {
		body.sha = existingSha;
	} else {
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
	return data.content.sha;
}

/**
 * Delete an entry from a domain folder
 */
export async function deleteEntry(filename, domain = 'daily', sha) {
	const { token, repo } = getConfig();
	if (!token || !repo) throw new Error('Not configured');

	const path = `${domain}/${filename}`;

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

export { DOMAINS };
