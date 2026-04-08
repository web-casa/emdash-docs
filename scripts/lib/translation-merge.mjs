import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { toPosixPath } from "./i18n-utils.mjs";

const execFileAsync = promisify(execFile);

export const TRANSLATION_STATE_ROOT = path.resolve(".translation-state");

export function createLocaleBaselinePath(relativePath, locale) {
	return path.join(TRANSLATION_STATE_ROOT, "baselines", locale, relativePath);
}

export function createLocaleMergePreviewPath(relativePath, locale) {
	return path.join(TRANSLATION_STATE_ROOT, "merge-previews", locale, relativePath);
}

export async function writeBaselineFile(relativePath, locale, content) {
	const filePath = createLocaleBaselinePath(relativePath, locale);
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content, "utf8");
	return filePath;
}

export async function writeMergePreviewFile(relativePath, locale, content) {
	const filePath = createLocaleMergePreviewPath(relativePath, locale);
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content, "utf8");
	return filePath;
}

export async function removeFileIfExists(filePath) {
	if (!filePath) {
		return;
	}

	try {
		await fs.rm(filePath, { force: true });
	} catch {
		// Ignore cleanup failures for generated state files.
	}
}

export function toProjectRelativePath(filePath) {
	return toPosixPath(path.relative(path.resolve("."), filePath));
}

export async function mergeLocalizedContent({
	currentContent,
	previousGeneratedContent,
	nextGeneratedContent,
}) {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "emdash-translation-merge-"));
	const currentFile = path.join(tempDir, "current.mdx");
	const baseFile = path.join(tempDir, "base.mdx");
	const incomingFile = path.join(tempDir, "incoming.mdx");

	await Promise.all([
		fs.writeFile(currentFile, currentContent, "utf8"),
		fs.writeFile(baseFile, previousGeneratedContent, "utf8"),
		fs.writeFile(incomingFile, nextGeneratedContent, "utf8"),
	]);

	try {
		const { stdout } = await execFileAsync("git", [
			"merge-file",
			"-p",
			"-L",
			"current",
			"-L",
			"previous-generated",
			"-L",
			"next-generated",
			currentFile,
			baseFile,
			incomingFile,
		]);

		return {
			status: "clean",
			content: stdout,
		};
	} catch (error) {
		if (typeof error?.code === "number" && error.code === 1) {
			return {
				status: "conflict",
				content: error.stdout,
			};
		}

		throw error;
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}
