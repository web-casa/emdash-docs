import fs from "node:fs/promises";

import { getLocaleTranslationTarget } from "../../src/lib/locale.js";
import {
	createSegmentKey,
	getCachedSegmentTranslation,
	setCachedSegmentTranslation,
} from "./segment-cache.mjs";
import {
	extractCodeBlocks,
	extractImportExportLines,
	hasPlaceholders,
	loadEnvFile,
	maskContent,
	restoreContent,
	rewriteInternalLinks,
	rewriteRelativeImports,
	sha256,
} from "./i18n-utils.mjs";
import { formatGlossaryForPrompt } from "./translation-glossary.mjs";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_BATCH_CHARS = 6000;

function stripFenceWrapper(content) {
	if (!content.startsWith("```")) {
		return content;
	}

	const lines = content.split(/\r?\n/);
	if (lines.length < 3) {
		return content;
	}

	return lines.slice(1, -1).join("\n");
}

export function normalizeOutput(content) {
	return content.endsWith("\n") ? content : `${content}\n`;
}

export async function loadDeepSeekApiKey() {
	const env = await loadEnvFile();
	const apiKey =
		env.deepseek_api ??
		env.DEEPSEEK_API ??
		process.env.deepseek_api ??
		process.env.DEEPSEEK_API;

	if (!apiKey) {
		throw new Error("Missing DeepSeek API key. Add deepseek_api to .env.");
	}

	return apiKey;
}

async function fetchDeepSeekJson({ apiKey, model, systemPrompt, userContent }) {
	const response = await fetch(DEEPSEEK_API_URL, {
		method: "POST",
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			temperature: 0.2,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userContent },
			],
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`DeepSeek API error ${response.status}: ${body}`);
	}

	const payload = await response.json();
	const content = payload?.choices?.[0]?.message?.content;
	if (typeof content !== "string" || !content.trim()) {
		throw new Error("DeepSeek returned an empty translation response.");
	}

	return stripFenceWrapper(content.trim());
}

async function translateWithDeepSeek({ apiKey, source, locale, model, feedback = "" }) {
	const targetLanguage = getLocaleTranslationTarget(locale);
	const glossaryPrompt = formatGlossaryForPrompt(locale);
	const systemPrompt = [
		"You are an expert technical translator for Markdown and MDX documentation.",
		`Translate the provided content into ${targetLanguage}.`,
		"Preserve Markdown, MDX, YAML frontmatter structure, headings, lists, tables, JSX tags, and formatting.",
		"Do not translate code, import/export statements, URLs, package names, CLI commands, environment variable names, or file paths unless they are ordinary human-language prose.",
		"Do not add unrelated content or examples.",
		"Do not wrap the result in code fences.",
		"Return only the translated MDX fragment.",
		glossaryPrompt,
	].filter(Boolean).join("\n");

	return fetchDeepSeekJson({
		apiKey,
		model,
		systemPrompt,
		userContent: [
			feedback ? `Correction note:\n${feedback}\n` : "",
			"Source MDX fragment:\n",
			source,
		].join("\n"),
	});
}

async function translateWithRetry({ apiKey, source, locale, model, attempts = 4 }) {
	let lastError;
	let feedback = "";

	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			return await translateWithDeepSeek({ apiKey, source, locale, model, feedback });
		} catch (error) {
			lastError = error;
			feedback =
				"Your previous answer was invalid. Return the full translated fragment only, with the same Markdown and MDX structure preserved.";
		}

		if (attempt === attempts) {
			break;
		}

		const delay = attempt * 1500;
		console.warn(`Retrying translation in ${delay}ms after error: ${lastError.message}`);
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	throw lastError;
}

async function translateJsonArrayWithDeepSeek({ apiKey, items, locale, model, feedback = "" }) {
	const targetLanguage = getLocaleTranslationTarget(locale);
	const glossaryPrompt = formatGlossaryForPrompt(locale);
	const systemPrompt = [
		"You are an expert technical translator for Markdown and MDX documentation.",
		`Translate each string in the provided JSON array into ${targetLanguage}.`,
		"Preserve Markdown, MDX, YAML frontmatter structure, headings, lists, tables, JSX tags, and formatting inside each item.",
		"Do not translate placeholders, code, import/export statements, URLs, package names, CLI commands, environment variable names, or file paths.",
		"Do not add unrelated content.",
		"Return a valid JSON array with the exact same number of items and in the exact same order.",
		glossaryPrompt,
	].filter(Boolean).join("\n");

	const raw = await fetchDeepSeekJson({
		apiKey,
		model,
		systemPrompt,
		userContent: [
			feedback ? `Correction note:\n${feedback}\n` : "",
			"Source JSON array:\n",
			JSON.stringify(items, null, 2),
		].join("\n"),
	});
	const parsed = JSON.parse(raw);

	if (!Array.isArray(parsed) || parsed.length !== items.length) {
		throw new Error("DeepSeek returned an invalid JSON array translation.");
	}

	return parsed;
}

async function translateJsonArrayWithRetry({ apiKey, items, locale, model, attempts = 4 }) {
	let lastError;
	let feedback = "";

	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			return await translateJsonArrayWithDeepSeek({
				apiKey,
				items,
				locale,
				model,
				feedback,
			});
		} catch (error) {
			lastError = error;
			feedback =
				"Your previous answer was invalid. Return only a valid JSON array with the same number of items, preserving each item's Markdown and MDX structure.";
		}

		if (attempt === attempts) {
			break;
		}

		const delay = attempt * 1500;
		console.warn(`Retrying translation in ${delay}ms after error: ${lastError.message}`);
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	throw lastError;
}

async function reviewJsonArrayWithDeepSeek({
	apiKey,
	sourceItems,
	translatedItems,
	locale,
	model,
	feedback = "",
}) {
	const targetLanguage = getLocaleTranslationTarget(locale);
	const glossaryPrompt = formatGlossaryForPrompt(locale);
	const systemPrompt = [
		"You are an expert reviewer for translated Markdown and MDX documentation.",
		`Review each translation and improve it only when needed for ${targetLanguage}.`,
		"Keep established technical terms consistent, preserve placeholders, Markdown, MDX, JSX, and formatting exactly.",
		"Do not translate code, import/export statements, URLs, package names, CLI commands, environment variable names, or file paths.",
		"Do not add new information.",
		"Return a valid JSON array with the same number of reviewed strings in the same order.",
		glossaryPrompt,
	].filter(Boolean).join("\n");

	const items = sourceItems.map((source, index) => ({
		source,
		translation: translatedItems[index],
	}));
	const raw = await fetchDeepSeekJson({
		apiKey,
		model,
		systemPrompt,
		userContent: [
			feedback ? `Correction note:\n${feedback}\n` : "",
			"Review this JSON array of translations:\n",
			JSON.stringify(items, null, 2),
		].join("\n"),
	});
	const parsed = JSON.parse(raw);

	if (!Array.isArray(parsed) || parsed.length !== translatedItems.length) {
		throw new Error("DeepSeek returned an invalid JSON array review.");
	}

	return parsed;
}

async function reviewJsonArrayWithRetry({
	apiKey,
	sourceItems,
	translatedItems,
	locale,
	model,
	attempts = 3,
}) {
	let lastError;
	let feedback = "";

	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			return await reviewJsonArrayWithDeepSeek({
				apiKey,
				sourceItems,
				translatedItems,
				locale,
				model,
				feedback,
			});
		} catch (error) {
			lastError = error;
			feedback =
				"Your previous answer was invalid. Return only a valid JSON array with the same number of reviewed strings, preserving Markdown and MDX structure exactly.";
		}

		if (attempt === attempts) {
			break;
		}

		const delay = attempt * 1500;
		console.warn(`Retrying review in ${delay}ms after error: ${lastError.message}`);
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	throw lastError;
}

function splitFrontmatter(sourceContent) {
	if (!sourceContent.startsWith("---\n")) {
		return {
			frontmatter: "",
			body: sourceContent,
		};
	}

	const endIndex = sourceContent.indexOf("\n---\n", 4);
	if (endIndex === -1) {
		return {
			frontmatter: "",
			body: sourceContent,
		};
	}

	const boundary = endIndex + 5;
	return {
		frontmatter: sourceContent.slice(0, boundary),
		body: sourceContent.slice(boundary),
	};
}

function normalizeStructuralSpacing(content) {
	return content
		.replace(/^(---)\s*(import\s)/m, "$1\n\n$2")
		.replace(/^(---)\s*(<[A-Za-z])/m, "$1\n\n$2")
		.replace(/(```[^\n]*\n[\s\S]*?\n```)(?=[^\n])/g, "$1\n")
		.replace(/(<\/[A-Za-z][^>]*>)(?=[^\n])/g, "$1\n");
}

function forceRestoreRemainingPlaceholders(content, tokens) {
	return content.replace(/@@MDX_TOKEN_(\d+)@@/g, (match, rawIndex) => {
		const token = tokens[Number(rawIndex)];
		return typeof token === "string" ? token : match;
	});
}

function assertStructuralIntegrity({ sourceContent, translatedContent, sourceFile }) {
	const sourceCodeBlocks = extractCodeBlocks(sourceContent);
	const translatedCodeBlocks = extractCodeBlocks(translatedContent);
	if (sourceCodeBlocks.length !== translatedCodeBlocks.length) {
		console.warn(`Code block count mismatch after translation: ${sourceFile}`);
	}

	const sourceImports = extractImportExportLines(sourceContent);
	const translatedImports = extractImportExportLines(translatedContent);
	if (sourceImports.length !== translatedImports.length) {
		throw new Error(`Import/export count mismatch after translation: ${sourceFile}`);
	}

	if (sourceContent.startsWith("---\n") && !translatedContent.startsWith("---\n")) {
		throw new Error(`Frontmatter start missing after translation: ${sourceFile}`);
	}
}

function shouldPreserveBlock(block) {
	const trimmed = block.trim();
	if (!trimmed) {
		return true;
	}

	return (
		trimmed.startsWith("```") ||
		/^(?:import|export)\s/m.test(trimmed) ||
		/^<!--/.test(trimmed) ||
		/^<\/?[A-Za-z][^>]*\/?>$/.test(trimmed)
	);
}

function chunkSegments(items, maxChars = MAX_BATCH_CHARS) {
	const batches = [];
	let currentBatch = [];
	let currentChars = 0;

	for (const item of items) {
		if (
			currentBatch.length > 0 &&
			currentChars + item.maskedContent.length > maxChars
		) {
			batches.push(currentBatch);
			currentBatch = [];
			currentChars = 0;
		}

		currentBatch.push(item);
		currentChars += item.maskedContent.length;
	}

	if (currentBatch.length > 0) {
		batches.push(currentBatch);
	}

	return batches;
}

async function translateBatch({ apiKey, batch, locale, model }) {
	try {
		return await translateJsonArrayWithRetry({
			apiKey,
			items: batch.map((item) => item.maskedContent),
			locale,
			model,
		});
	} catch (error) {
		if (batch.length === 1) {
			return [
				await translateWithRetry({
					apiKey,
					source: batch[0].maskedContent,
					locale,
					model,
				}),
			];
		}

		const middle = Math.ceil(batch.length / 2);
		const left = await translateBatch({
			apiKey,
			batch: batch.slice(0, middle),
			locale,
			model,
		});
		const right = await translateBatch({
			apiKey,
			batch: batch.slice(middle),
			locale,
			model,
		});
		return [...left, ...right];
	}
}

async function reviewBatch({ apiKey, batch, translatedItems, locale, model }) {
	try {
		return await reviewJsonArrayWithRetry({
			apiKey,
			sourceItems: batch.map((item) => item.maskedContent),
			translatedItems,
			locale,
			model,
		});
	} catch (error) {
		if (batch.length === 1) {
			console.warn(`Skipping review for one segment after error: ${error.message}`);
			return translatedItems;
		}

		const middle = Math.ceil(batch.length / 2);
		const left = await reviewBatch({
			apiKey,
			batch: batch.slice(0, middle),
			translatedItems: translatedItems.slice(0, middle),
			locale,
			model,
		});
		const right = await reviewBatch({
			apiKey,
			batch: batch.slice(middle),
			translatedItems: translatedItems.slice(middle),
			locale,
			model,
		});
		return [...left, ...right];
	}
}

async function resolveSegmentTranslations({
	apiKey,
	locale,
	model,
	segments,
	segmentCache = { entries: {} },
	persistSegmentCache = async () => {},
	reviewSegments = true,
}) {
	if (segments.length === 0) {
		return new Map();
	}

	const resolved = new Map();
	const uniquePending = new Map();

	for (const segment of segments) {
		const sourceHash = sha256(segment.maskedContent);
		const key = createSegmentKey({
			kind: segment.kind,
			source: segment.maskedContent,
		});
		const cached = getCachedSegmentTranslation(segmentCache, {
			key,
			sourceHash,
			review: reviewSegments,
		});

		if (cached) {
			resolved.set(segment.id, cached);
			continue;
		}

		if (!uniquePending.has(key)) {
			uniquePending.set(key, {
				key,
				kind: segment.kind,
				sourceHash,
				maskedContent: segment.maskedContent,
			});
		}
	}

	if (uniquePending.size === 0) {
		return resolved;
	}

	let cacheDirty = false;
	for (const batch of chunkSegments([...uniquePending.values()])) {
		const translatedItems = await translateBatch({
			apiKey,
			batch,
			locale,
			model,
		});
		const finalItems = reviewSegments
			? await reviewBatch({
				apiKey,
				batch,
				translatedItems,
				locale,
				model,
			})
			: translatedItems;

		for (let index = 0; index < batch.length; index += 1) {
			const segment = batch[index];
			setCachedSegmentTranslation(segmentCache, {
				key: segment.key,
				kind: segment.kind,
				source: segment.maskedContent,
				sourceHash: segment.sourceHash,
				translated: translatedItems[index],
				reviewed: reviewSegments ? finalItems[index] : null,
				model,
			});
			cacheDirty = true;
		}
	}

	if (cacheDirty) {
		await persistSegmentCache();
	}

	for (const segment of segments) {
		const sourceHash = sha256(segment.maskedContent);
		const key = createSegmentKey({
			kind: segment.kind,
			source: segment.maskedContent,
		});
		const cached = getCachedSegmentTranslation(segmentCache, {
			key,
			sourceHash,
			review: reviewSegments,
		});
		if (cached) {
			resolved.set(segment.id, cached);
		}
	}

	return resolved;
}

async function translateFrontmatter({
	apiKey,
	frontmatter,
	locale,
	model,
	segmentCache,
	persistSegmentCache,
	reviewSegments,
}) {
	if (!frontmatter) {
		return "";
	}

	const translations = await resolveSegmentTranslations({
		apiKey,
		locale,
		model,
		segments: [
			{
				id: "frontmatter",
				kind: "frontmatter",
				maskedContent: frontmatter,
			},
		],
		segmentCache,
		persistSegmentCache,
		reviewSegments,
	});

	return `${translations.get("frontmatter")}\n`;
}

async function translateBodyBlocks({
	apiKey,
	body,
	locale,
	model,
	segmentCache,
	persistSegmentCache,
	reviewSegments,
}) {
	const parts = body.split(/(\n{2,})/g);
	const translatableBlocks = [];

	for (let index = 0; index < parts.length; index += 1) {
		const part = parts[index];
		if (!part || /^\n{2,}$/.test(part) || shouldPreserveBlock(part)) {
			continue;
		}

		const masked = maskContent(part);
		if (!masked.content.trim() || /^@@MDX_TOKEN_\d+@@$/.test(masked.content.trim())) {
			continue;
		}

		translatableBlocks.push({
			id: String(index),
			kind: "body-block",
			index,
			maskedContent: masked.content,
			tokens: masked.tokens,
		});
	}

	const translations = await resolveSegmentTranslations({
		apiKey,
		locale,
		model,
		segments: translatableBlocks,
		segmentCache,
		persistSegmentCache,
		reviewSegments,
	});

	for (const block of translatableBlocks) {
		const translatedText = translations.get(block.id) ?? block.maskedContent;
		let restoredBlock = restoreContent(translatedText, block.tokens);

		if (hasPlaceholders(restoredBlock)) {
			const fallbackTranslation = await translateWithRetry({
				apiKey,
				source: block.maskedContent,
				locale,
				model,
			});
			restoredBlock = restoreContent(fallbackTranslation, block.tokens);
		}

		if (hasPlaceholders(restoredBlock)) {
			restoredBlock = forceRestoreRemainingPlaceholders(restoredBlock, block.tokens);
		}

		if (hasPlaceholders(restoredBlock)) {
			console.warn("Placeholder recovery failed for one translated block; falling back to source block.");
			restoredBlock = restoreContent(block.maskedContent, block.tokens);
		}

		parts[block.index] = restoredBlock;
	}

	return parts.join("");
}

export async function generateLocalizedDocument({
	apiKey,
	locale,
	model,
	sourceContent,
	sourceFile,
	targetFile,
	segmentCache = { entries: {} },
	persistSegmentCache = async () => {},
	reviewSegments = true,
}) {
	const { frontmatter, body } = splitFrontmatter(sourceContent);
	const translatedFrontmatter = await translateFrontmatter({
		apiKey,
		locale,
		model,
		frontmatter,
		segmentCache,
		persistSegmentCache,
		reviewSegments,
	});
	const translatedBody = await translateBodyBlocks({
		apiKey,
		body,
		locale,
		model,
		segmentCache,
		persistSegmentCache,
		reviewSegments,
	});

	let restored = `${translatedFrontmatter}${translatedBody}`;
	restored = normalizeStructuralSpacing(restored);
	restored = rewriteRelativeImports(restored, sourceFile, targetFile);
	restored = rewriteInternalLinks(restored, locale);
	const normalized = normalizeOutput(restored);

	if (hasPlaceholders(normalized)) {
		throw new Error(`Unrestored placeholder found in ${sourceFile}`);
	}

	assertStructuralIntegrity({
		sourceContent,
		translatedContent: normalized,
		sourceFile,
	});

	return normalized;
}

export async function generateLocalizedDocumentFromFile({
	apiKey,
	locale,
	model,
	sourceFile,
	targetFile,
	segmentCache,
	persistSegmentCache,
	reviewSegments,
}) {
	const sourceContent = await fs.readFile(sourceFile, "utf8");
	return generateLocalizedDocument({
		apiKey,
		locale,
		model,
		sourceContent,
		sourceFile,
		targetFile,
		segmentCache,
		persistSegmentCache,
		reviewSegments,
	});
}
