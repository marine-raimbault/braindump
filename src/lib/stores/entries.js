import { writable, derived } from 'svelte/store';
import { fetchAllEntries, saveEntry as ghSave, isConfigured as ghConfigured } from '$lib/github.js';
import { parseEntry, serializeEntry, entryToFilename } from '$lib/markdown.js';

// Core state
export const entries = writable([]);
export const loading = writable(false);
export const syncing = writable(false);
export const lastSync = writable(null);
export const error = writable(null);

// SHA cache - tracks the GitHub SHA for each file so we can update without re-fetching
const shaCache = {};

// Derived stores
export const trainableEntries = derived(entries, $e =>
	$e.filter(e => e.trainable && e.training_q)
);

export const stats = derived(entries, $e => ({
	total: $e.length,
	trainable: $e.filter(e => e.trainable).length,
	mastered: $e.filter(e => e.reviews >= 12).length,
	totalReviews: $e.reduce((sum, e) => sum + e.reviews, 0),
	categories: $e.reduce((acc, e) => {
		acc[e.category] = (acc[e.category] || 0) + 1;
		return acc;
	}, {})
}));

/**
 * Load all entries from GitHub
 */
export async function loadEntries() {
	if (!ghConfigured()) return;

	loading.set(true);
	error.set(null);

	try {
		const raw = await fetchAllEntries();
		const parsed = raw.map(({ filename, content, sha }) => {
			const entry = parseEntry(filename, content);
			shaCache[entry.id] = sha;
			return entry;
		});

		// Sort by creation time
		parsed.sort((a, b) => a.created - b.created);
		entries.set(parsed);
		lastSync.set(Date.now());
	} catch (e) {
		error.set(e.message);
		console.error('Load failed:', e);
	} finally {
		loading.set(false);
	}
}

/**
 * Add a new entry - saves to store and syncs to GitHub
 */
export async function addEntry(entryData) {
	const entry = {
		...entryData,
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
		reviews: 0,
		lastReview: null,
		created: Date.now()
	};

	// Optimistic update - add to store immediately
	entries.update(all => [...all, entry]);

	// Sync to GitHub in background
	if (ghConfigured()) {
		syncing.set(true);
		try {
			const md = serializeEntry(entry);
			const sha = await ghSave(entryToFilename(entry), md);
			shaCache[entry.id] = sha;
		} catch (e) {
			error.set(`Sync failed: ${e.message}`);
			console.error('Save failed:', e);
		} finally {
			syncing.set(false);
		}
	}

	return entry;
}

/**
 * Update an existing entry (e.g. after training review)
 */
export async function updateEntry(updated) {
	// Update store
	entries.update(all => all.map(e => e.id === updated.id ? updated : e));

	// Sync to GitHub
	if (ghConfigured()) {
		syncing.set(true);
		try {
			const md = serializeEntry(updated);
			const sha = await ghSave(entryToFilename(updated), md, shaCache[updated.id]);
			shaCache[updated.id] = sha;
		} catch (e) {
			error.set(`Sync failed: ${e.message}`);
			console.error('Update failed:', e);
		} finally {
			syncing.set(false);
		}
	}
}
