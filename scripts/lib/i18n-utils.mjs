import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const DOCS_ROOT = path.resolve("src/content/docs");
export const MANIFEST_PATH = path.resolve("translation-manifest.json");
export const PLACEHOLDER_PREFIX = "@@MDX_TOKEN_";
export const FENCED_CODE_BLOCK_RE = /(^(`{3,})[^\n]*\n[\s\S]*?^\2[ \t]*$)/gm;

const LOCALE_SEGMENT_RE = /^(ar|de|en|es|fr|ja|ko|pt|ru|zh|zh-cn|zh-tw)$/i;
const ENGLISH_STOPWORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"before",
	"by",
	"for",
	"from",
	"if",
	"in",
	"into",
	"is",
	"it",
	"no",
	"of",
	"on",
	"or",
	"the",
	"then",
	"this",
	"to",
	"under",
	"use",
	"when",
	"with",
	"without",
	"your",
]);
const ENGLISH_STRONG_STOPWORDS = new Set([
	"and",
	"before",
	"from",
	"into",
	"that",
	"the",
	"then",
	"this",
	"under",
	"when",
	"with",
	"without",
	"your",
]);
const ENGLISH_ALLOWLIST = new Set([
	"api",
	"apis",
	"app",
	"apps",
	"astro",
	"auth",
	"block",
	"blocks",
	"browser",
	"cli",
	"cloudflare",
	"cms",
	"css",
	"d1",
	"db",
	"emdash",
	"github",
	"html",
	"http",
	"https",
	"id",
	"ids",
	"json",
	"jwt",
	"kv",
	"mdx",
	"node",
	"oauth",
	"portable",
	"postgres",
	"postgresql",
	"preview",
	"react",
	"rest",
	"router",
	"schema",
	"schemas",
	"seo",
	"sql",
	"sqlite",
	"ssr",
	"svg",
	"token",
	"tokens",
	"ts",
	"tsx",
	"typescript",
	"url",
	"urls",
	"vite",
	"webauthn",
	"wysiwyg",
	"xss",
]);

export function toPosixPath(value) {
	return value.split(path.sep).join("/");
}

export async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function readJson(filePath, fallback) {
	if (!(await fileExists(filePath))) {
		return fallback;
	}

	return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function writeJson(filePath, value) {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function sha256(content) {
	return crypto.createHash("sha256").update(content).digest("hex");
}

export function parseArgs(argv) {
	const args = {};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (!arg.startsWith("--")) {
			continue;
		}

		const [key, inlineValue] = arg.slice(2).split("=", 2);
		if (inlineValue !== undefined) {
			args[key] = inlineValue;
			continue;
		}

		const next = argv[index + 1];
		if (!next || next.startsWith("--")) {
			args[key] = true;
			continue;
		}

		args[key] = next;
		index += 1;
	}

	return args;
}

export async function loadEnvFile(envPath = path.resolve(".env")) {
	const env = {};

	if (!(await fileExists(envPath))) {
		return env;
	}

	const raw = await fs.readFile(envPath, "utf8");
	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separator = trimmed.indexOf("=");
		if (separator === -1) {
			continue;
		}

		const key = trimmed.slice(0, separator).trim();
		const value = trimmed.slice(separator + 1).trim();
		env[key] = value;
	}

	return env;
}

export async function collectEnglishDocFiles(rootDir = DOCS_ROOT) {
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolutePath = path.join(rootDir, entry.name);

		if (entry.isDirectory()) {
			if (LOCALE_SEGMENT_RE.test(entry.name)) {
				continue;
			}

			files.push(...(await collectEnglishDocFiles(absolutePath)));
			continue;
		}

		if (/\.(md|mdx)$/i.test(entry.name)) {
			files.push(absolutePath);
		}
	}

	return files.sort();
}

export function createLocaleTargetPath(sourceFile, locale) {
	const relativePath = path.relative(DOCS_ROOT, sourceFile);
	return path.join(DOCS_ROOT, locale, relativePath);
}

export function createPlaceholder(index) {
	return `${PLACEHOLDER_PREFIX}${index}@@`;
}

export function maskContent(source) {
	const tokens = [];
	let content = source;

	const patterns = [
		FENCED_CODE_BLOCK_RE,
		/<!--[\s\S]*?-->/g,
		/^(?:import|export)\s.+$/gm,
		/^---\s*$/gm,
		/^(\|[\s:.-]+\|)\s*$/gm,
		/\{[^{}]+\}/g,
		/https?:\/\/[^\s)<>"']+/g,
	];

	for (const pattern of patterns) {
		content = content.replace(pattern, (match) => {
			const placeholder = createPlaceholder(tokens.length);
			tokens.push(match);
			return placeholder;
		});
	}

	return { content, tokens };
}

export function restoreContent(source, tokens) {
	let content = source;

	for (let index = 0; index < tokens.length; index += 1) {
		const placeholder = createPlaceholder(index);
		content = content.split(placeholder).join(tokens[index]);
	}

	return content;
}

export function hasPlaceholders(content) {
	return content.includes(PLACEHOLDER_PREFIX);
}

export function rewriteInternalLinks(content, locale) {
	if (!locale || locale === "root") {
		return content;
	}

	const prefixPath = (rawPath) => {
		const firstSegment = rawPath.slice(1).split("/", 1)[0];
		if (
			!rawPath.startsWith("/") ||
			LOCALE_SEGMENT_RE.test(firstSegment) ||
			rawPath.startsWith("/_") ||
			rawPath.startsWith("//") ||
			rawPath.startsWith("/assets/") ||
			rawPath.startsWith("/favicon") ||
			rawPath.startsWith("/robots.txt") ||
			rawPath.startsWith("/sitemap")
		) {
			return rawPath;
		}

		return `/${locale}${rawPath}`;
	};

	return content
		.replace(/(\]\()([^)\s]+)(\))/g, (match, start, rawPath, end) => {
			if (!rawPath.startsWith("/")) {
				return match;
			}
			return `${start}${prefixPath(rawPath)}${end}`;
		})
		.replace(/((?:link|href):\s*["']?)(\/[^"'\s]+)/g, (match, start, rawPath) => {
			return `${start}${prefixPath(rawPath)}`;
		})
		.replace(/((?:link|href)=["'])(\/[^"']+)(["'])/g, (match, start, rawPath, end) => {
			return `${start}${prefixPath(rawPath)}${end}`;
		});
}

export function rewriteRelativeImports(content, sourceFile, targetFile) {
	const sourceDir = path.dirname(sourceFile);
	const targetDir = path.dirname(targetFile);

	return content.replace(
		/^(import\s+.+?\s+from\s+["'])(\.[^"']+)(["'];?\s*)$/gm,
		(match, start, importPath, end) => {
			const absoluteImport = path.resolve(sourceDir, importPath);
			const rewritten = toPosixPath(path.relative(targetDir, absoluteImport));
			const normalized = rewritten.startsWith(".") ? rewritten : `./${rewritten}`;
			return `${start}${normalized}${end}`;
		},
	);
}

export function extractCodeBlocks(content) {
	return content.match(FENCED_CODE_BLOCK_RE) ?? [];
}

export function extractImportExportLines(content) {
	return content.match(/^(?:import|export)\s.+$/gm) ?? [];
}

export function stripNonProse(content) {
	return maskContent(content).content;
}

export function findSuspiciousEnglish(content) {
	const cleaned = stripNonProse(content)
		.replace(/@@MDX_TOKEN_\d+@@/g, " ")
		.replace(/\[[^\]]*\]\([^)]+\)/g, " ")
		.replace(/`[^`\n]+`/g, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	const segments = cleaned
		.split(/[.!?。！？:;；]+/g)
		.map((segment) => segment.trim())
		.filter(Boolean);
	const matches = [];

	for (const segment of segments) {
		const asciiWords = segment.match(/\b[A-Za-z][A-Za-z/'-]*\b/g) ?? [];
		if (asciiWords.length < 4) {
			continue;
		}

		let stopwordCount = 0;
		let strongStopwordCount = 0;
		let meaningfulWordCount = 0;

		for (const word of asciiWords) {
			const normalized = word.toLowerCase();
			if (ENGLISH_ALLOWLIST.has(normalized)) {
				continue;
			}

			meaningfulWordCount += 1;
			if (ENGLISH_STOPWORDS.has(normalized)) {
				stopwordCount += 1;
			}
			if (ENGLISH_STRONG_STOPWORDS.has(normalized)) {
				strongStopwordCount += 1;
			}
		}

		if (meaningfulWordCount < 3 || stopwordCount < 2 || strongStopwordCount < 1) {
			continue;
		}

		if (stopwordCount / Math.max(meaningfulWordCount, 1) < 0.2) {
			continue;
		}

		matches.push(segment.slice(0, 120));
	}

	return [...new Set(matches)].slice(0, 10);
}
