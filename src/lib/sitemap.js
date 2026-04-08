import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { LOCALE_OPTIONS } from "./locale.js";

const DOCS_DIR = path.resolve(process.cwd(), "src/content/docs");
const DOC_EXTENSIONS = new Set([".md", ".mdx"]);
const LOCALE_PREFIXES = new Set(
	LOCALE_OPTIONS.filter(({ locale }) => locale !== "root").map(({ locale }) => locale),
);

function walkDocs(dir) {
	const entries = readdirSync(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkDocs(fullPath));
			continue;
		}

		if (DOC_EXTENSIONS.has(path.extname(entry.name))) {
			files.push(fullPath);
		}
	}

	return files;
}

function extractFrontmatterLastUpdated(filePath) {
	const source = readFileSync(filePath, "utf8");
	const match = source.match(/^---\n([\s\S]*?)\n---/);
	if (!match) {
		return null;
	}

	const lastUpdatedMatch = match[1].match(/^lastUpdated:\s*([^\n]+)$/m);
	if (!lastUpdatedMatch) {
		return null;
	}

	const parsed = new Date(lastUpdatedMatch[1].trim());
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getGitLastModified(filePath) {
	try {
		const output = execFileSync("git", ["log", "-1", "--format=%cI", "--", filePath], {
			cwd: process.cwd(),
			encoding: "utf8",
		}).trim();
		if (!output) {
			return null;
		}

		const parsed = new Date(output);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	} catch {
		return null;
	}
}

function toRoutePath(filePath) {
	const relativePath = path.relative(DOCS_DIR, filePath);
	const parts = relativePath.split(path.sep);
	const extensionless = parts.at(-1).replace(/\.(md|mdx)$/u, "");
	const firstSegment = parts[0];
	const hasLocalePrefix = LOCALE_PREFIXES.has(firstSegment);
	const localePrefix = hasLocalePrefix ? `/${firstSegment}` : "";
	const contentParts = hasLocalePrefix ? parts.slice(1, -1) : parts.slice(0, -1);
	const slugParts = extensionless === "index" ? contentParts : [...contentParts, extensionless];
	const pathname = `${localePrefix}/${slugParts.join("/")}`.replace(/\/+/gu, "/");

	if (pathname === "/") {
		return "/";
	}

	return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function createSitemapLastmodMap() {
	const entries = new Map();

	for (const filePath of walkDocs(DOCS_DIR)) {
		const routePath = toRoutePath(filePath);
		const lastmod = extractFrontmatterLastUpdated(filePath) ?? getGitLastModified(filePath);
		if (lastmod) {
			entries.set(routePath, lastmod);
		}
	}

	return entries;
}
