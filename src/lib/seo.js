import {
	DEFAULT_LOCALE,
	getLocaleLang,
	getLocalePath,
	localeFromPath,
} from "./locale.js";

export const SITE_NAME = "HiEmdash Docs";

const SECTION_LABELS = {
	"coming-from": {
		en: "Coming From...",
		"zh-cn": "从这些平台迁移",
		ja: "他のプラットフォームから移行",
		ko: "다른 플랫폼에서 이전",
		es: "Llegando desde...",
		pt: "Vindo de...",
		fr: "Vous venez de...",
		de: "Umstieg von...",
	},
	concepts: {
		en: "Concepts",
		"zh-cn": "概念",
		ja: "概念",
		ko: "개념",
		es: "Conceptos",
		pt: "Conceitos",
		fr: "Concepts",
		de: "Konzepte",
	},
	contributing: {
		en: "Contributing",
		"zh-cn": "参与贡献",
		ja: "コントリビュート",
		ko: "기여하기",
		es: "Contribuir",
		pt: "Contribuição",
		fr: "Contribution",
		de: "Mitwirken",
	},
	deployment: {
		en: "Deployment",
		"zh-cn": "部署",
		ja: "デプロイ",
		ko: "배포",
		es: "Despliegue",
		pt: "Implantação",
		fr: "Déploiement",
		de: "Deployment",
	},
	guides: {
		en: "Guides",
		"zh-cn": "指南",
		ja: "ガイド",
		ko: "가이드",
		es: "Guías",
		pt: "Guias",
		fr: "Guides",
		de: "Anleitungen",
	},
	migration: {
		en: "Migration",
		"zh-cn": "迁移",
		ja: "移行",
		ko: "마이그레이션",
		es: "Migración",
		pt: "Migração",
		fr: "Migration",
		de: "Migration",
	},
	plugins: {
		en: "Plugins",
		"zh-cn": "插件",
		ja: "プラグイン",
		ko: "플러그인",
		es: "Plugins",
		pt: "Plugins",
		fr: "Plugins",
		de: "Plugins",
	},
	reference: {
		en: "Reference",
		"zh-cn": "参考",
		ja: "リファレンス",
		ko: "레퍼런스",
		es: "Referencia",
		pt: "Referência",
		fr: "Référence",
		de: "Referenz",
	},
	themes: {
		en: "Themes",
		"zh-cn": "主题",
		ja: "テーマ",
		ko: "테마",
		es: "Temas",
		pt: "Temas",
		fr: "Thèmes",
		de: "Themes",
	},
};

const HOME_LABELS = {
	en: "Home",
	"zh-cn": "首页",
	ja: "ホーム",
	ko: "홈",
	es: "Inicio",
	pt: "Início",
	fr: "Accueil",
	de: "Startseite",
};

function getLocaleLabel(locale, labels) {
	return labels[locale] ?? labels.en;
}

export function isStarlight404(route) {
	return route.entry.id === "404" || route.entry.id.endsWith("/404");
}

export function buildCanonicalUrl(site, pathname) {
	return new URL(pathname, site).toString();
}

export function buildDefaultLocalePath(pathname) {
	const locale = localeFromPath(pathname);
	if (locale === DEFAULT_LOCALE) {
		return pathname;
	}

	return pathname.replace(getLocalePath(locale), "/");
}

export function buildBreadcrumbJsonLd({ site, pathname, pageTitle, locale }) {
	const homePath = locale === DEFAULT_LOCALE ? "/" : getLocalePath(locale);
	const homeLabel = HOME_LABELS[locale] ?? HOME_LABELS.en;
	const contentPath = buildDefaultLocalePath(pathname);
	const segments = contentPath.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
	const items = [
		{
			"@type": "ListItem",
			position: 1,
			name: homeLabel,
			item: buildCanonicalUrl(site, homePath),
		},
	];

	if (segments.length > 1) {
		const sectionLabel = SECTION_LABELS[segments[0]]
			? getLocaleLabel(locale, SECTION_LABELS[segments[0]])
			: null;

		if (sectionLabel) {
			items.push({
				"@type": "ListItem",
				position: items.length + 1,
				name: sectionLabel,
			});
		}
	}

	if (pathname !== homePath) {
		items.push({
			"@type": "ListItem",
			position: items.length + 1,
			name: pageTitle,
			item: buildCanonicalUrl(site, pathname),
		});
	}

	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items,
	};
}

export function buildWebsiteJsonLd({ site, locale, description }) {
	const rootPath = locale === DEFAULT_LOCALE ? "/" : getLocalePath(locale);
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		url: buildCanonicalUrl(site, rootPath),
		description,
		inLanguage: getLocaleLang(locale),
	};
}

export function getSocialImageAlt(locale) {
	return (
		{
			"zh-cn": "HiEmdash Docs，一个社区维护的 EmDash 多语言文档站点。",
			ja: "HiEmdash Docs。コミュニティが運営する EmDash の多言語ドキュメントサイトです。",
			ko: "HiEmdash Docs. 커뮤니티가 운영하는 EmDash 다국어 문서 사이트입니다.",
			es: "HiEmdash Docs, un sitio de documentación multilingüe de EmDash creado por la comunidad.",
			pt: "HiEmdash Docs, um site comunitário de documentação multilíngue do EmDash.",
			fr: "HiEmdash Docs, un site communautaire de documentation multilingue pour EmDash.",
			de: "HiEmdash Docs, eine von der Community gepflegte mehrsprachige Dokumentationsseite für EmDash.",
		}[locale] ?? "HiEmdash Docs, a community-built multilingual documentation site for EmDash."
	);
}
