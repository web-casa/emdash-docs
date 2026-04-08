export const DEFAULT_LOCALE = "root";
export const LOCALE_COOKIE = "emdash-docs-locale";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_OPTIONS = [
	{
		locale: "root",
		path: "/",
		languagePrefixes: ["en"],
		label: "English",
		lang: "en",
		translationTarget: "English",
	},
	{
		locale: "zh-cn",
		path: "/zh-cn/",
		languagePrefixes: ["zh-cn", "zh-hans", "zh"],
		label: "简体中文",
		lang: "zh-CN",
		translationTarget: "Simplified Chinese",
	},
	{
		locale: "ja",
		path: "/ja/",
		languagePrefixes: ["ja", "ja-jp"],
		label: "日本語",
		lang: "ja",
		translationTarget: "Japanese",
	},
	{
		locale: "ko",
		path: "/ko/",
		languagePrefixes: ["ko", "ko-kr"],
		label: "한국어",
		lang: "ko",
		translationTarget: "Korean",
	},
	{
		locale: "es",
		path: "/es/",
		languagePrefixes: ["es", "es-es", "es-419", "es-mx"],
		label: "Español",
		lang: "es",
		translationTarget: "Spanish",
	},
	{
		locale: "pt",
		path: "/pt/",
		languagePrefixes: ["pt", "pt-br", "pt-pt"],
		label: "Português",
		lang: "pt",
		translationTarget: "Portuguese",
	},
	{
		locale: "fr",
		path: "/fr/",
		languagePrefixes: ["fr", "fr-fr", "fr-ca"],
		label: "Français",
		lang: "fr",
		translationTarget: "French",
	},
	{
		locale: "de",
		path: "/de/",
		languagePrefixes: ["de", "de-de", "de-at", "de-ch"],
		label: "Deutsch",
		lang: "de",
		translationTarget: "German",
	},
];

const SUPPORTED_LOCALES = new Set(LOCALE_OPTIONS.map((option) => option.locale));
const NON_ROOT_LOCALES = LOCALE_OPTIONS
	.filter((option) => option.locale !== DEFAULT_LOCALE)
	.sort((left, right) => right.path.length - left.path.length);
const LANGUAGE_MATCHERS = LOCALE_OPTIONS.flatMap((option) =>
	option.languagePrefixes.map((prefix) => ({
		locale: option.locale,
		prefix,
	})),
).sort((left, right) => right.prefix.length - left.prefix.length);

export function normalizeLocale(locale) {
	if (typeof locale !== "string") {
		return null;
	}

	const normalized = locale.toLowerCase();
	return SUPPORTED_LOCALES.has(normalized) ? normalized : null;
}

export function getLocaleOption(locale) {
	const normalized = normalizeLocale(locale) ?? DEFAULT_LOCALE;
	return LOCALE_OPTIONS.find((option) => option.locale === normalized) ?? LOCALE_OPTIONS[0];
}

export function localeFromPath(pathname) {
	for (const option of NON_ROOT_LOCALES) {
		const barePath = option.path.endsWith("/") ? option.path.slice(0, -1) : option.path;
		if (pathname === barePath || pathname.startsWith(option.path)) {
			return option.locale;
		}
	}

	return DEFAULT_LOCALE;
}

export function getLocalePath(locale) {
	return getLocaleOption(locale).path;
}

export function getLocaleLang(locale) {
	return getLocaleOption(locale).lang;
}

export function getLocaleTranslationTarget(locale) {
	return getLocaleOption(locale).translationTarget;
}

export function parseAcceptLanguage(acceptLanguage) {
	if (!acceptLanguage) {
		return [];
	}

	return acceptLanguage
		.split(",")
		.map((entry, index) => {
			const [rawLanguage, ...params] = entry.trim().split(";");
			const qValue = params.find((param) => param.trim().startsWith("q="));
			const q = qValue ? Number.parseFloat(qValue.trim().slice(2)) : 1;
			return {
				language: rawLanguage.toLowerCase(),
				q: Number.isFinite(q) ? q : 0,
				index,
			};
		})
		.filter(({ language, q }) => language && q > 0)
		.sort((left, right) => {
			if (right.q !== left.q) {
				return right.q - left.q;
			}

			return left.index - right.index;
		});
}

export function matchLocaleForLanguage(language) {
	const normalized = String(language ?? "").toLowerCase();
	if (!normalized) {
		return null;
	}

	if (normalized === "*") {
		return DEFAULT_LOCALE;
	}

	for (const matcher of LANGUAGE_MATCHERS) {
		if (
			normalized === matcher.prefix ||
			normalized.startsWith(`${matcher.prefix}-`)
		) {
			return matcher.locale;
		}
	}

	return null;
}

export function detectPreferredLocale(acceptLanguage) {
	for (const preference of parseAcceptLanguage(acceptLanguage)) {
		const locale = matchLocaleForLanguage(preference.language);
		if (locale) {
			return locale;
		}
	}

	return DEFAULT_LOCALE;
}

export function detectPreferredLocaleFromLanguages(languages) {
	for (const language of languages) {
		const locale = matchLocaleForLanguage(language);
		if (locale) {
			return locale;
		}
	}

	return DEFAULT_LOCALE;
}

export function resolvePreferredLocale({ storedLocale, acceptLanguage }) {
	return normalizeLocale(storedLocale) ?? detectPreferredLocale(acceptLanguage);
}
