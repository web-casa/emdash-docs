import fs from "node:fs/promises";
import path from "node:path";

import { faqItemsByLocale } from "../src/data/faq-items.js";
import { getLocaleTranslationTarget } from "../src/lib/locale.js";
import { loadDeepSeekApiKey } from "./lib/deepseek-translate.mjs";
import { parseArgs } from "./lib/i18n-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const model = String(args.model ?? "deepseek-chat");
const REQUEST_TIMEOUT_MS = 90_000;
const locales = String(args.locales ?? "")
	.split(",")
	.map((value) => value.trim().toLowerCase())
	.filter(Boolean);
const outputFile = path.resolve("src/data/faq-items.js");

function serializeFaqItems(itemsByLocale) {
	return `export const faqItemsByLocale = ${JSON.stringify(itemsByLocale, null, 2)};\n`;
}

async function translateLocaleFaqItems({ apiKey, locale, model, sourceItems }) {
	const targetLanguage = getLocaleTranslationTarget(locale);
	const systemPrompt = [
		"You are an expert technical translator.",
		`Translate the provided JSON array into ${targetLanguage}.`,
		"Preserve the JSON structure and keys exactly.",
		"Translate only the string values of question and answer.",
		"Return valid JSON only. Do not wrap the result in code fences.",
	].join(" ");

	for (let attempt = 1; attempt <= 4; attempt += 1) {
		const response = await fetch("https://api.deepseek.com/chat/completions", {
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
					{
						role: "user",
						content: JSON.stringify(sourceItems, null, 2),
					},
				],
			}),
		});

		if (response.ok) {
			const payload = await response.json();
			const content = payload?.choices?.[0]?.message?.content?.trim();
			if (!content) {
				throw new Error(`DeepSeek returned an empty FAQ translation for locale=${locale}`);
			}

			try {
				const parsed = JSON.parse(content);
				if (!Array.isArray(parsed)) {
					throw new Error("Translated FAQ payload is not an array.");
				}
				return parsed;
			} catch (error) {
				if (attempt === 4) {
					throw error;
				}
			}
		} else if (attempt === 4) {
			const body = await response.text();
			throw new Error(`DeepSeek API error ${response.status} for locale=${locale}: ${body}`);
		}

		await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
	}

	throw new Error(`Unable to translate FAQ data for locale=${locale}`);
}

async function main() {
	if (locales.length === 0) {
		throw new Error("Missing locales. Use --locales ja,ko,es,pt,fr,de");
	}

	const apiKey = await loadDeepSeekApiKey();
	const nextFaqItems = {
		...faqItemsByLocale,
	};

	for (const locale of locales) {
		console.log(`translate faq-data ${locale}`);
		nextFaqItems[locale] = await translateLocaleFaqItems({
			apiKey,
			locale,
			model,
			sourceItems: faqItemsByLocale.root,
		});
	}

	await fs.writeFile(outputFile, serializeFaqItems(nextFaqItems), "utf8");
	console.log(`faq-data updated locales=${locales.join(",")} file=${path.relative(process.cwd(), outputFile)}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
