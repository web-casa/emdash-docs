import path from "node:path";

import { readJson, sha256, writeJson } from "./i18n-utils.mjs";

const SEGMENT_CACHE_VERSION = 1;
const SEGMENT_CACHE_ROOT = path.resolve(".translation-state/segments");

export function createSegmentCachePath(locale) {
	return path.join(SEGMENT_CACHE_ROOT, `${locale}.json`);
}

export function createSegmentKey({ kind, source }) {
	return sha256(`${kind}\u0000${source}`);
}

export async function loadLocaleSegmentCache(locale) {
	const cachePath = createSegmentCachePath(locale);
	const fallback = {
		version: SEGMENT_CACHE_VERSION,
		locale,
		entries: {},
	};
	const data = await readJson(cachePath, fallback);
	if (!data || typeof data !== "object") {
		return fallback;
	}

	return {
		version: SEGMENT_CACHE_VERSION,
		locale,
		entries: typeof data.entries === "object" && data.entries ? data.entries : {},
	};
}

export async function writeLocaleSegmentCache(locale, cache) {
	const cachePath = createSegmentCachePath(locale);
	await writeJson(cachePath, {
		version: SEGMENT_CACHE_VERSION,
		locale,
		entries: cache.entries ?? {},
	});
}

export function getCachedSegmentTranslation(cache, { key, sourceHash, review = true }) {
	const entry = cache?.entries?.[key];
	if (!entry || entry.sourceHash !== sourceHash) {
		return null;
	}

	if (review && typeof entry.reviewed === "string" && entry.reviewed.trim()) {
		return entry.reviewed;
	}

	if (typeof entry.translated === "string" && entry.translated.trim()) {
		return entry.translated;
	}

	return null;
}

export function setCachedSegmentTranslation(
	cache,
	{ key, kind, source, sourceHash, translated, reviewed = null, model },
) {
	cache.entries[key] = {
		kind,
		source,
		sourceHash,
		translated,
		reviewed,
		model,
		updatedAt: new Date().toISOString(),
	};
}
