import test from "node:test";
import assert from "node:assert/strict";

import {
	createSegmentKey,
	getCachedSegmentTranslation,
	setCachedSegmentTranslation,
} from "../scripts/lib/segment-cache.mjs";
import { sha256 } from "../scripts/lib/i18n-utils.mjs";

test("createSegmentKey is stable for the same kind and source", () => {
	const left = createSegmentKey({
		kind: "body-block",
		source: "Hello world",
	});
	const right = createSegmentKey({
		kind: "body-block",
		source: "Hello world",
	});

	assert.equal(left, right);
});

test("getCachedSegmentTranslation prefers reviewed text and falls back to translated text", () => {
	const cache = { entries: {} };
	const source = "Hello world";
	const sourceHash = sha256(source);
	const key = createSegmentKey({
		kind: "body-block",
		source,
	});

	setCachedSegmentTranslation(cache, {
		key,
		kind: "body-block",
		source,
		sourceHash,
		translated: "Hola mundo",
		reviewed: "Hola, mundo",
		model: "deepseek-chat",
	});

	assert.equal(
		getCachedSegmentTranslation(cache, { key, sourceHash, review: true }),
		"Hola, mundo",
	);
	assert.equal(
		getCachedSegmentTranslation(cache, { key, sourceHash, review: false }),
		"Hola mundo",
	);
});
