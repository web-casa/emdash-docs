import fs from "node:fs/promises";
import path from "node:path";

import {
	DOCS_ROOT,
	MANIFEST_PATH,
	collectEnglishDocFiles,
	createLocaleTargetPath,
	fileExists,
	parseArgs,
	readJson,
	sha256,
	toPosixPath,
	writeJson,
} from "./lib/i18n-utils.mjs";
import {
	generateLocalizedDocument,
	loadDeepSeekApiKey,
} from "./lib/deepseek-translate.mjs";
import {
	createLocaleBaselinePath,
	removeFileIfExists,
	toProjectRelativePath,
	writeBaselineFile,
} from "./lib/translation-merge.mjs";

const args = parseArgs(process.argv.slice(2));
const locale = String(args.locale ?? "zh-cn").toLowerCase();
const model = String(args.model ?? "deepseek-chat");
const force = Boolean(args.force);
const concurrency = Math.max(1, Number(args.concurrency ?? 4));
const onlyFiles =
	typeof args.files === "string"
		? new Set(args.files.split(",").map((item) => item.trim()).filter(Boolean))
		: null;

async function main() {
	const apiKey = await loadDeepSeekApiKey();
	const manifest = await readJson(MANIFEST_PATH, { locales: {} });
	const localeManifest = manifest.locales[locale] ?? {};
	const sourceFiles = await collectEnglishDocFiles(DOCS_ROOT);
	const selectedFiles = onlyFiles
		? sourceFiles.filter((filePath) =>
				onlyFiles.has(toPosixPath(path.relative(DOCS_ROOT, filePath))),
			)
		: sourceFiles;

	let initializedFromCurrentCount = 0;
	let regeneratedBaselineCount = 0;
	let skippedCount = 0;
	let cursor = 0;
	let manifestWrite = Promise.resolve();

	const persistManifest = async () => {
		manifest.locales[locale] = localeManifest;
		manifestWrite = manifestWrite.then(() => writeJson(MANIFEST_PATH, manifest));
		await manifestWrite;
	};

	const processFile = async (sourceFile) => {
		const relativePath = toPosixPath(path.relative(DOCS_ROOT, sourceFile));
		const targetFile = createLocaleTargetPath(sourceFile, locale);
		if (!(await fileExists(targetFile))) {
			console.warn(`skip ${relativePath} (missing target file)`);
			skippedCount += 1;
			return;
		}

		const baselineFile = createLocaleBaselinePath(relativePath, locale);
		const [sourceContent, targetContent] = await Promise.all([
			fs.readFile(sourceFile, "utf8"),
			fs.readFile(targetFile, "utf8"),
		]);
		const sourceHash = sha256(sourceContent);
		const targetHash = sha256(targetContent);
		const targetTrimmedHash = sha256(targetContent.trimEnd());
		const currentEntry = localeManifest[relativePath];
		const currentModel = currentEntry?.model ?? model;

		if (
			!force &&
			currentEntry?.generatedHash &&
			currentEntry?.targetHash === targetHash &&
			currentEntry?.sourceHash === sourceHash &&
			(await fileExists(baselineFile))
		) {
			console.log(`skip ${relativePath}`);
			skippedCount += 1;
			return;
		}

		let generatedContent = targetContent;
		let initializedFromCurrent = false;
		if (
			currentEntry?.generatedHash === targetHash ||
			currentEntry?.generatedHash === targetTrimmedHash ||
			currentEntry?.targetHash === targetHash ||
			currentEntry?.targetHash === targetTrimmedHash
		) {
			initializedFromCurrent = true;
		} else {
			console.log(`rebuild baseline ${relativePath}`);
			generatedContent = await generateLocalizedDocument({
				apiKey,
				locale,
				model: currentModel,
				sourceContent,
				sourceFile,
				targetFile,
			});
		}

		await writeBaselineFile(relativePath, locale, generatedContent);
		await removeFileIfExists(currentEntry?.mergePreviewFile);

		localeManifest[relativePath] = {
			...currentEntry,
			sourceHash,
			targetHash,
			generatedHash: sha256(generatedContent),
			sourceFile: relativePath,
			targetFile: toProjectRelativePath(targetFile),
			generatedFile: toProjectRelativePath(baselineFile),
			translatedAt: currentEntry?.translatedAt ?? new Date().toISOString(),
			mergeStatus:
				targetHash === sha256(generatedContent) ? "machine" : "humanized",
			model: currentModel,
			mergePreviewFile: undefined,
			baselineInitializedAt: new Date().toISOString(),
		};
		await persistManifest();

		if (initializedFromCurrent) {
			console.log(`init baseline ${relativePath}`);
			initializedFromCurrentCount += 1;
		} else {
			regeneratedBaselineCount += 1;
		}
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
	await manifestWrite;
	console.log(
		`baseline-init locale=${locale} initializedFromCurrent=${initializedFromCurrentCount} regenerated=${regeneratedBaselineCount} skipped=${skippedCount} total=${selectedFiles.length} concurrency=${concurrency}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
