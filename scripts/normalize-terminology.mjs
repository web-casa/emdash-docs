import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_LOCALE, LOCALE_OPTIONS } from "../src/lib/locale.js";
import {
	DOCS_ROOT,
	collectEnglishDocFiles,
	createLocaleTargetPath,
	fileExists,
	parseArgs,
	toPosixPath,
} from "./lib/i18n-utils.mjs";
import { normalizeGlossaryTerms } from "./lib/translation-glossary.mjs";

const args = parseArgs(process.argv.slice(2));
const onlyLocales = typeof args.locales === "string"
	? new Set(args.locales.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))
	: null;

async function main() {
	const sourceFiles = await collectEnglishDocFiles(DOCS_ROOT);
	const locales = LOCALE_OPTIONS
		.filter((option) => option.locale !== DEFAULT_LOCALE)
		.map((option) => option.locale)
		.filter((locale) => !onlyLocales || onlyLocales.has(locale));

	let changedFiles = 0;
	let replacementCount = 0;

	for (const locale of locales) {
		let localeChangedFiles = 0;
		let localeReplacementCount = 0;

		for (const sourceFile of sourceFiles) {
			const targetFile = createLocaleTargetPath(sourceFile, locale);
			if (!(await fileExists(targetFile))) {
				continue;
			}

			const original = await fs.readFile(targetFile, "utf8");
			const result = normalizeGlossaryTerms(original, locale);

			if (result.replacements.length === 0 || result.content === original) {
				continue;
			}

			await fs.writeFile(targetFile, result.content, "utf8");
			localeChangedFiles += 1;
			changedFiles += 1;

			const fileReplacementCount = result.replacements.reduce(
				(total, replacement) => total + replacement.count,
				0,
			);
			localeReplacementCount += fileReplacementCount;
			replacementCount += fileReplacementCount;

			console.log(
				`${locale} ${toPosixPath(path.relative(DOCS_ROOT, targetFile))} replacements=${fileReplacementCount}`,
			);
		}

		console.log(
			`locale=${locale} changedFiles=${localeChangedFiles} replacements=${localeReplacementCount}`,
		);
	}

	console.log(`done changedFiles=${changedFiles} replacements=${replacementCount}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
