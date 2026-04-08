import { LOCALE_OPTIONS, normalizeLocale } from "../../src/lib/locale.js";
import { maskContent, restoreContent } from "./i18n-utils.mjs";

export const TRANSLATION_GLOSSARY = [
	{
		source: "Admin Panel",
		translations: {
			"zh-cn": "管理面板",
			ja: "管理パネル",
			ko: "관리자 패널",
			es: "panel de administración",
			pt: "painel de administração",
			fr: "panneau d’administration",
			de: "Admin-Oberfläche",
		},
	},
	{
		source: "Content Model",
		translations: {
			"zh-cn": "内容模型",
			ja: "コンテンツモデル",
			ko: "콘텐츠 모델",
			es: "modelo de contenido",
			pt: "modelo de conteúdo",
			fr: "modèle de contenu",
			de: "Inhaltsmodell",
		},
	},
	{
		source: "Collection",
		translations: {
			"zh-cn": "集合",
			ja: "コレクション",
			ko: "컬렉션",
			es: "colección",
			pt: "coleção",
			fr: "collection",
			de: "Sammlung",
		},
	},
	{
		source: "Live Collections",
		translations: {
			"zh-cn": "实时集合",
			ja: "ライブコレクション",
			ko: "라이브 컬렉션",
			es: "colecciones dinámicas",
			pt: "coleções dinâmicas",
			fr: "collections dynamiques",
			de: "dynamische Sammlungen",
		},
	},
	{
		source: "Theme",
		translations: {
			"zh-cn": "主题",
			ja: "テーマ",
			ko: "테마",
			es: "tema",
			pt: "tema",
			fr: "thème",
			de: "Theme",
		},
	},
	{
		source: "Plugin",
		translations: {
			"zh-cn": "插件",
			ja: "プラグイン",
			ko: "플러그인",
			es: "plugin",
			pt: "plugin",
			fr: "plugin",
			de: "Plugin",
		},
	},
	{
		source: "Widget",
		translations: {
			"zh-cn": "小组件",
			ja: "ウィジェット",
			ko: "위젯",
			es: "widget",
			pt: "widget",
			fr: "widget",
			de: "Widget",
		},
	},
	{
		source: "Widget Area",
		translations: {
			"zh-cn": "小组件区域",
			ja: "ウィジェットエリア",
			ko: "위젯 영역",
			es: "área de widgets",
			pt: "área de widgets",
			fr: "zone de widgets",
			de: "Widget-Bereich",
		},
	},
	{
		source: "Taxonomy",
		translations: {
			"zh-cn": "分类法",
			ja: "タクソノミー",
			ko: "분류 체계",
			es: "taxonomía",
			pt: "taxonomia",
			fr: "taxonomie",
			de: "Taxonomie",
		},
	},
	{
		source: "Seed File",
		translations: {
			"zh-cn": "种子文件",
			ja: "シードファイル",
			ko: "시드 파일",
			es: "archivo semilla",
			pt: "arquivo semente",
			fr: "fichier d’amorçage",
			de: "Seed-Datei",
		},
	},
	{
		source: "Portable Text",
		translations: {
			"zh-cn": "Portable Text",
			ja: "Portable Text",
			ko: "Portable Text",
			es: "Portable Text",
			pt: "Portable Text",
			fr: "Portable Text",
			de: "Portable Text",
		},
	},
	{
		source: "REST API",
		translations: {
			"zh-cn": "REST API",
			ja: "REST API",
			ko: "REST API",
			es: "API REST",
			pt: "API REST",
			fr: "API REST",
			de: "REST API",
		},
	},
	{
		source: "Field Type",
		translations: {
			"zh-cn": "字段类型",
			ja: "フィールドタイプ",
			ko: "필드 유형",
			es: "tipo de campo",
			pt: "tipo de campo",
			fr: "type de champ",
			de: "Feldtyp",
		},
	},
	{
		source: "Featured Image",
		translations: {
			"zh-cn": "特色图片",
			ja: "アイキャッチ画像",
			ko: "대표 이미지",
			es: "imagen destacada",
			pt: "imagem destacada",
			fr: "image mise en avant",
			de: "Beitragsbild",
		},
	},
	{
		source: "Sidebar",
		translations: {
			"zh-cn": "侧边栏",
			ja: "サイドバー",
			ko: "사이드바",
			es: "barra lateral",
			pt: "barra lateral",
			fr: "barre latérale",
			de: "Seitenleiste",
		},
	},
	{
		source: "Passkey",
		translations: {
			"zh-cn": "Passkey",
			ja: "パスキー",
			ko: "패스키",
			es: "clave de acceso",
			pt: "chave de acesso",
			fr: "clé d’accès",
			de: "Passkey",
		},
	},
	{
		source: "Magic Link",
		translations: {
			"zh-cn": "Magic Link",
			ja: "マジックリンク",
			ko: "매직 링크",
			es: "enlace mágico",
			pt: "link mágico",
			fr: "lien magique",
			de: "Magic Link",
		},
	},
	{
		source: "Slug",
		translations: {
			"zh-cn": "slug",
			ja: "スラッグ",
			ko: "슬러그",
			es: "slug",
			pt: "slug",
			fr: "slug",
			de: "Slug",
		},
	},
	{
		source: "Draft",
		translations: {
			"zh-cn": "草稿",
			ja: "下書き",
			ko: "초안",
			es: "borrador",
			pt: "rascunho",
			fr: "brouillon",
			de: "Entwurf",
		},
	},
	{
		source: "Revision",
		translations: {
			"zh-cn": "修订",
			ja: "リビジョン",
			ko: "리비전",
			es: "revisión",
			pt: "revisão",
			fr: "révision",
			de: "Revision",
		},
	},
	{
		source: "Preview",
		translations: {
			"zh-cn": "预览",
			ja: "プレビュー",
			ko: "미리보기",
			es: "vista previa",
			pt: "pré-visualização",
			fr: "aperçu",
			de: "Vorschau",
		},
	},
	{
		source: "Middleware",
		translations: {
			"zh-cn": "中间件",
			ja: "ミドルウェア",
			ko: "미들웨어",
			es: "middleware",
			pt: "middleware",
			fr: "middleware",
			de: "Middleware",
		},
	},
	{
		source: "Site Settings",
		translations: {
			"zh-cn": "站点设置",
			ja: "サイト設定",
			ko: "사이트 설정",
			es: "ajustes del sitio",
			pt: "configurações do site",
			fr: "paramètres du site",
			de: "Website-Einstellungen",
		},
	},
	{
		source: "Media Library",
		translations: {
			"zh-cn": "媒体库",
			ja: "メディアライブラリ",
			ko: "미디어 라이브러리",
			es: "biblioteca multimedia",
			pt: "biblioteca de mídia",
			fr: "médiathèque",
			de: "Medienbibliothek",
		},
	},
	{
		source: "Querying Content",
		translations: {
			"zh-cn": "查询内容",
			ja: "コンテンツの取得",
			ko: "콘텐츠 조회",
			es: "consulta de contenido",
			pt: "consulta de conteúdo",
			fr: "requêtes de contenu",
			de: "Inhalte abfragen",
		},
	},
];

export const TERMINOLOGY_NORMALIZATION_RULES = {
	"zh-cn": [
		{ from: "管理后台", to: "管理面板" },
		{ from: "Live Collections", to: "实时集合" },
	],
	ja: [
		{ from: "管理画面", to: "管理パネル" },
		{ from: "メディアライブラリー", to: "メディアライブラリ" },
		{ from: "データモデル", to: "コンテンツモデル" },
		{ from: "Live Collections", to: "ライブコレクション" },
	],
	ko: [
		{ from: "관리 화면", to: "관리자 패널" },
		{ from: "데이터 모델", to: "콘텐츠 모델" },
		{ from: "Live Collections", to: "라이브 컬렉션" },
	],
	es: [
		{ from: "panel de control de administración", to: "panel de administración" },
		{ from: "panel de control", to: "panel de administración" },
		{ from: "biblioteca de medios", to: "biblioteca multimedia" },
		{ from: "modelo de datos", to: "modelo de contenido" },
		{ from: "colecciones en vivo", to: "colecciones dinámicas" },
		{ from: "Live Collections", to: "colecciones dinámicas" },
	],
	pt: [
		{ from: "modelo de dados", to: "modelo de conteúdo" },
		{ from: "Live Collections", to: "coleções dinâmicas" },
	],
	fr: [
		{ from: "bibliothèque de médias", to: "médiathèque" },
		{ from: "modèle de données", to: "modèle de contenu" },
		{ from: "collections en direct", to: "collections dynamiques" },
		{ from: "Live Collections", to: "collections dynamiques" },
	],
	de: [
		{ from: "Admin-Panel", to: "Admin-Oberfläche" },
		{ from: "Datenmodell", to: "Inhaltsmodell" },
		{ from: "Live Collections", to: "dynamische Sammlungen" },
	],
};

const SUPPORTED_TRANSLATION_LOCALES = new Set(
	LOCALE_OPTIONS.filter((option) => option.locale !== "root").map((option) => option.locale),
);

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getGlossaryEntries(locale) {
	const normalized = normalizeLocale(locale);
	if (!normalized || !SUPPORTED_TRANSLATION_LOCALES.has(normalized)) {
		return [];
	}

	return TRANSLATION_GLOSSARY.map((entry) => ({
		source: entry.source,
		target: entry.translations[normalized] ?? entry.source,
	}));
}

export function formatGlossaryForPrompt(locale) {
	const entries = getGlossaryEntries(locale);
	if (entries.length === 0) {
		return "";
	}

	return [
		"Use this approved terminology glossary consistently whenever the source term appears in natural-language prose:",
		...entries.map((entry) => `- ${entry.source} => ${entry.target}`),
		"Do not force glossary terms into code, file paths, package names, CLI commands, environment variables, import/export lines, or URLs.",
	].join("\n");
}

export function normalizeGlossaryTerms(content, locale) {
	const normalized = normalizeLocale(locale);
	const rules = TERMINOLOGY_NORMALIZATION_RULES[normalized] ?? [];

	if (!normalized || rules.length === 0) {
		return {
			content,
			replacements: [],
		};
	}

	const masked = maskContent(content);
	let nextContent = masked.content;
	const replacements = [];

	for (const rule of rules) {
		const pattern = new RegExp(escapeRegExp(rule.from), "g");
		const matches = nextContent.match(pattern);
		if (!matches || matches.length === 0) {
			continue;
		}

		nextContent = nextContent.replace(pattern, rule.to);
		replacements.push({
			from: rule.from,
			to: rule.to,
			count: matches.length,
		});
	}

	return {
		content: restoreContent(nextContent, masked.tokens),
		replacements,
	};
}
