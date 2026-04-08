import test from "node:test";
import assert from "node:assert/strict";

import { LOCALE_OPTIONS } from "../src/lib/locale.js";
import {
	formatGlossaryForPrompt,
	getGlossaryEntries,
	normalizeGlossaryTerms,
	TRANSLATION_GLOSSARY,
} from "../scripts/lib/translation-glossary.mjs";

test("translation glossary covers every non-root locale for every term", () => {
	const locales = LOCALE_OPTIONS.filter((option) => option.locale !== "root").map(
		(option) => option.locale,
	);

	for (const entry of TRANSLATION_GLOSSARY) {
		for (const locale of locales) {
			assert.equal(typeof entry.translations[locale], "string");
			assert.notEqual(entry.translations[locale].trim(), "");
		}
	}
});

test("getGlossaryEntries returns locale-specific pairs", () => {
	const entries = getGlossaryEntries("es");
	assert.ok(entries.length > 0);
	assert.deepEqual(entries[0], {
		source: "Admin Panel",
		target: "panel de administración",
	});
});

test("formatGlossaryForPrompt returns a stable prompt block", () => {
	const prompt = formatGlossaryForPrompt("fr");

	assert.match(prompt, /Use this approved terminology glossary consistently/);
	assert.match(prompt, /- Admin Panel => panneau d’administration/);
	assert.match(prompt, /- Querying Content => requêtes de contenu/);
});

test("formatGlossaryForPrompt returns an empty string for unsupported locales", () => {
	assert.equal(formatGlossaryForPrompt("root"), "");
	assert.equal(formatGlossaryForPrompt("unknown"), "");
});

test("normalizeGlossaryTerms replaces old localized terminology outside code fences", () => {
	const source = [
		"Accede al panel de control y abre la biblioteca de medios.",
		"",
		"```ts",
		'const note = "panel de control";',
		"```",
	].join("\n");

	const normalized = normalizeGlossaryTerms(source, "es");

	assert.match(normalized.content, /panel de administración/);
	assert.match(normalized.content, /biblioteca multimedia/);
	assert.match(normalized.content, /const note = "panel de control";/);
	assert.deepEqual(
		normalized.replacements.map((item) => [item.from, item.count]),
		[
			["panel de control", 1],
			["biblioteca de medios", 1],
		],
	);
});
