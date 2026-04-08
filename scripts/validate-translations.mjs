import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_LOCALE, LOCALE_OPTIONS, getLocalePath } from "../src/lib/locale.js";
import {
	DOCS_ROOT,
	collectEnglishDocFiles,
	createLocaleTargetPath,
	extractCodeBlocks,
	fileExists,
	findSuspiciousEnglish,
	hasPlaceholders,
	parseArgs,
	readJson,
	MANIFEST_PATH,
	toPosixPath,
} from "./lib/i18n-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const locale = String(args.locale ?? "zh-cn").toLowerCase();
const supportedLocalePrefixes = LOCALE_OPTIONS
	.filter((option) => option.locale !== DEFAULT_LOCALE)
	.map((option) => getLocalePath(option.locale).replace(/^\/|\/$/g, ""))
	.filter(Boolean)
	.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const localizedInternalLinkPattern = new RegExp(
	`\\]\\(/(?!${supportedLocalePrefixes.length > 0 ? `(?:${supportedLocalePrefixes.join("|")})/|` : ""}_)[^)]+\\)`,
	"g",
);

function normalizeImportLines(content, filePath) {
	const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, "");
	const fileDir = path.dirname(filePath);
	return (withoutCodeBlocks.match(/^(?:import|export)\s.+$/gm) ?? []).map((line) =>
		line.replace(/from\s+["'](\.[^"']+)["']/, (_, importPath) => {
			const absolutePath = toPosixPath(path.resolve(fileDir, importPath));
			return `from "${absolutePath}"`;
		}),
	);
}

async function main() {
	const sourceFiles = await collectEnglishDocFiles(DOCS_ROOT);
	const manifest = await readJson(MANIFEST_PATH, { locales: {} });
	const localeManifest = manifest.locales?.[locale] ?? {};
	const failures = [];
	const warnings = [];
	let checked = 0;

	for (const sourceFile of sourceFiles) {
		const relativePath = toPosixPath(path.relative(DOCS_ROOT, sourceFile));
		const targetFile = createLocaleTargetPath(sourceFile, locale);

		if (!(await fileExists(targetFile))) {
			failures.push(`missing translation: ${relativePath}`);
			continue;
		}

		const [sourceContent, targetContent] = await Promise.all([
			fs.readFile(sourceFile, "utf8"),
			fs.readFile(targetFile, "utf8"),
		]);

		if (hasPlaceholders(targetContent)) {
			failures.push(`unrestored placeholder: ${relativePath}`);
		}

		const sourceBlocks = extractCodeBlocks(sourceContent);
		const targetBlocks = extractCodeBlocks(targetContent);
		if (sourceBlocks.length !== targetBlocks.length) {
			warnings.push(`code block count mismatch: ${relativePath}`);
		}

		const sourceImports = normalizeImportLines(sourceContent, sourceFile);
		const targetImports = normalizeImportLines(targetContent, targetFile);
		if (JSON.stringify(sourceImports) !== JSON.stringify(targetImports)) {
			failures.push(`import/export mismatch: ${relativePath}`);
		}

		if (sourceContent.trim() === targetContent.trim()) {
			warnings.push(`translation identical to source: ${relativePath}`);
		}

		const unprefixedInternalLinks = targetContent.match(localizedInternalLinkPattern) ?? [];
		if (unprefixedInternalLinks.length > 0) {
			warnings.push(
				`unprefixed internal links (${unprefixedInternalLinks.length}): ${relativePath}`,
			);
		}

		const englishFragments = findSuspiciousEnglish(targetContent);
		if (englishFragments.length > 0) {
			warnings.push(
				`suspicious English (${englishFragments.slice(0, 3).join(" | ")}): ${relativePath}`,
			);
		}

		checked += 1;
	}

	for (const [relativePath, entry] of Object.entries(localeManifest)) {
		if (entry?.mergeStatus === "conflict" && entry?.mergePreviewFile) {
			warnings.push(`pending merge conflict (${entry.mergePreviewFile}): ${relativePath}`);
		}
	}

	console.log(`checked ${checked} translated files for locale=${locale}`);

	if (warnings.length > 0) {
		console.log("\nWarnings:");
		for (const warning of warnings) {
			console.log(`- ${warning}`);
		}
	}

	if (failures.length > 0) {
		console.log("\nFailures:");
		for (const failure of failures) {
			console.log(`- ${failure}`);
		}
		process.exitCode = 1;
		return;
	}

	console.log("\nValidation passed.");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
