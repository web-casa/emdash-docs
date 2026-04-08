import test from "node:test";
import assert from "node:assert/strict";

import { mergeLocalizedContent } from "../scripts/lib/translation-merge.mjs";

test("mergeLocalizedContent preserves local edits when machine changes do not conflict", async () => {
	const result = await mergeLocalizedContent({
		previousGeneratedContent: "Title\n\nParagraph A\n\nParagraph B\n",
		currentContent: "Title\n\nParagraph A\n\nParagraph B (human)\n",
		nextGeneratedContent: "标题\n\nParagraph A\n\nParagraph B\n",
	});

	assert.equal(result.status, "clean");
	assert.match(result.content, /标题/);
	assert.match(result.content, /Paragraph B \(human\)/);
});

test("mergeLocalizedContent reports conflicts when both sides edit the same lines", async () => {
	const result = await mergeLocalizedContent({
		previousGeneratedContent: "Title\n",
		currentContent: "Title by human\n",
		nextGeneratedContent: "标题\n",
	});

	assert.equal(result.status, "conflict");
	assert.match(result.content, /<<<<<<< current/);
	assert.match(result.content, />>>>>>> next-generated/);
});
