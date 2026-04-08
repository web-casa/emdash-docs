import fs from "node:fs/promises";
import path from "node:path";

import {
	DOCS_ROOT,
	MANIFEST_PATH,
	collectEnglishDocFiles,
	createLocaleTargetPath,
	fileExists,
	hasPlaceholders,
	loadEnvFile,
	maskContent,
	parseArgs,
	readJson,
	restoreContent,
	rewriteRelativeImports,
	rewriteInternalLinks,
	sha256,
	toPosixPath,
	writeJson,
} from "./lib/i18n-utils.mjs";
import {
	generateLocalizedDocument,
	loadDeepSeekApiKey,
} from "./lib/deepseek-translate.mjs";
import {
	loadLocaleSegmentCache,
	writeLocaleSegmentCache,
} from "./lib/segment-cache.mjs";
import {
	createLocaleBaselinePath,
	createLocaleMergePreviewPath,
	mergeLocalizedContent,
	removeFileIfExists,
	toProjectRelativePath,
	writeBaselineFile,
	writeMergePreviewFile,
} from "./lib/translation-merge.mjs";

const args = parseArgs(process.argv.slice(2));
const locale = String(args.locale ?? "zh-cn").toLowerCase();
const model = String(args.model ?? "deepseek-chat");
const force = Boolean(args.force);
const concurrency = Math.max(1, Number(args.concurrency ?? 4));
const reviewSegments = args.review !== "false";
const onlyFiles = typeof args.files === "string" ? new Set(args.files.split(",").map((item) => item.trim()).filter(Boolean)) : null;

async function main() {
	const apiKey = await loadDeepSeekApiKey();

	const manifest = await readJson(MANIFEST_PATH, { locales: {} });
	const localeManifest = manifest.locales[locale] ?? {};
	const segmentCache = await loadLocaleSegmentCache(locale);
	const sourceFiles = await collectEnglishDocFiles(DOCS_ROOT);
	const selectedFiles = onlyFiles
		? sourceFiles.filter((filePath) => onlyFiles.has(toPosixPath(path.relative(DOCS_ROOT, filePath))))
		: sourceFiles;

	if (selectedFiles.length === 0) {
		console.log("No source files selected for translation.");
		return;
	}

	let translatedCount = 0;
	let skippedCount = 0;
	let preservedLocalEditsCount = 0;
	let mergedCount = 0;
	let mergeConflictCount = 0;
	let manifestWrite = Promise.resolve();
	let segmentCacheWrite = Promise.resolve();
	let cursor = 0;

	const persistManifest = async () => {
		manifest.locales[locale] = localeManifest;
		manifestWrite = manifestWrite.then(() => writeJson(MANIFEST_PATH, manifest));
		await manifestWrite;
	};

	const persistSegmentCache = async () => {
		segmentCacheWrite = segmentCacheWrite.then(() =>
			writeLocaleSegmentCache(locale, segmentCache),
		);
		await segmentCacheWrite;
	};

	const processFile = async (sourceFile) => {
		const relativePath = toPosixPath(path.relative(DOCS_ROOT, sourceFile));
		const targetFile = createLocaleTargetPath(sourceFile, locale);
		const baselineFile = createLocaleBaselinePath(relativePath, locale);
		const mergePreviewFile = createLocaleMergePreviewPath(relativePath, locale);
		const sourceContent = await fs.readFile(sourceFile, "utf8");
		const sourceHash = sha256(sourceContent);
			const currentEntry = localeManifest[relativePath];
			const targetExists = await fileExists(targetFile);
			const currentTargetContent = targetExists
				? await fs.readFile(targetFile, "utf8")
				: null;
			const currentTargetHash = currentTargetContent ? sha256(currentTargetContent) : null;
			const currentTargetTrimmedHash = currentTargetContent
				? sha256(currentTargetContent.trimEnd())
				: null;
			const baselineExists = await fileExists(baselineFile);
			const currentMatchesStoredTarget = Boolean(
				currentEntry?.targetHash &&
					(currentEntry.targetHash === currentTargetHash ||
						currentEntry.targetHash === currentTargetTrimmedHash),
			);

			if (
				!force &&
			currentEntry?.sourceHash === sourceHash &&
			targetExists
		) {
			if (
				baselineExists === false &&
				currentEntry?.targetHash &&
				currentTargetHash === currentEntry.targetHash &&
				currentTargetContent
			) {
				await writeBaselineFile(relativePath, locale, currentTargetContent);
				localeManifest[relativePath] = {
					...currentEntry,
					generatedHash: sha256(currentTargetContent),
					generatedFile: toProjectRelativePath(baselineFile),
					targetHash: sha256(currentTargetContent),
				};
				await persistManifest();
			}

			console.log(`skip ${relativePath}`);
			skippedCount += 1;
			return;
		}

			console.log(`translate ${relativePath}`);
			const nextGeneratedContent = await generateLocalizedDocument({
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

			const hasManagedLocalizedContent =
				targetExists &&
				currentEntry?.generatedHash &&
				currentTargetHash &&
				currentTargetHash !== currentEntry.generatedHash;
			const canMergeLocalEdits =
				hasManagedLocalizedContent &&
				currentEntry?.generatedHash &&
				baselineExists;
			let targetOutput = nextGeneratedContent;
			let mergeStatus = "machine";

		if (canMergeLocalEdits) {
			const previousGeneratedContent = await fs.readFile(baselineFile, "utf8");
			const mergeResult = await mergeLocalizedContent({
				currentContent: currentTargetContent,
				previousGeneratedContent,
				nextGeneratedContent,
			});

			if (mergeResult.status === "conflict") {
				await writeMergePreviewFile(relativePath, locale, normalizeOutput(mergeResult.content));
				localeManifest[relativePath] = {
					...currentEntry,
					pendingSourceHash: sourceHash,
					pendingGeneratedHash: sha256(nextGeneratedContent),
					pendingGeneratedFile: toProjectRelativePath(baselineFile),
					pendingTranslatedAt: new Date().toISOString(),
					mergeStatus: "conflict",
					mergePreviewFile: toProjectRelativePath(mergePreviewFile),
					model,
				};
				await persistManifest();
				console.warn(`merge conflict ${relativePath} (see ${toProjectRelativePath(mergePreviewFile)})`);
				skippedCount += 1;
				mergeConflictCount += 1;
				return;
			}

				targetOutput = normalizeOutput(mergeResult.content);
				mergeStatus = "merged";
				mergedCount += 1;
			} else if (hasManagedLocalizedContent) {
				console.warn(
					`preserve local edits ${relativePath} (missing merge baseline; rerun with --force to overwrite)`,
				);
			skippedCount += 1;
			preservedLocalEditsCount += 1;
			return;
		}

		await fs.mkdir(path.dirname(targetFile), { recursive: true });
		await fs.writeFile(targetFile, targetOutput, "utf8");
		await writeBaselineFile(relativePath, locale, nextGeneratedContent);
		await removeFileIfExists(mergePreviewFile);

			localeManifest[relativePath] = {
				sourceHash,
				targetHash: sha256(targetOutput),
				generatedHash: sha256(nextGeneratedContent),
			sourceFile: relativePath,
			targetFile: toPosixPath(path.relative(path.resolve("."), targetFile)),
			generatedFile: toProjectRelativePath(baselineFile),
				translatedAt: new Date().toISOString(),
				mergeStatus,
				model,
			};
			if (!currentMatchesStoredTarget && currentEntry?.generatedHash && !canMergeLocalEdits) {
				preservedLocalEditsCount += 1;
			}
			await persistManifest();

		translatedCount += 1;
	};

	const worker = async () => {
		while (true) {
			const sourceFile = selectedFiles[cursor];
			cursor += 1;

			if (!sourceFile) {
				return;
			}

			await processFile(sourceFile);
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, selectedFiles.length) }, () => worker()),
	);

	if (manifest.locales[locale] !== localeManifest) {
		manifest.locales[locale] = localeManifest;
	}
	await manifestWrite;
	await segmentCacheWrite;

	console.log(
		`done locale=${locale} translated=${translatedCount} merged=${mergedCount} conflicts=${mergeConflictCount} skipped=${skippedCount} preservedLocalEdits=${preservedLocalEditsCount} total=${selectedFiles.length} concurrency=${concurrency} review=${reviewSegments}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
