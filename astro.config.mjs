import cloudflare from "@astrojs/cloudflare";
import starlight from "@astrojs/starlight";
// @ts-check
import { defineConfig } from "astro/config";
import { LOCALE_OPTIONS } from "./src/lib/locale.js";
import { resolveSiteUrl } from "./src/lib/site-config.js";

const localeLangMap = Object.fromEntries(
	LOCALE_OPTIONS.map(({ locale, lang, label }) => [locale, { lang, label }]),
);

const sidebarTranslations = {
	"Start Here": {
		"zh-CN": "开始使用",
		ja: "はじめに",
		ko: "시작하기",
		es: "Comienza aquí",
		pt: "Comece aqui",
		fr: "Pour commencer",
		de: "Erste Schritte",
	},
	"Learn More": {
		"zh-CN": "深入了解",
		ja: "さらに詳しく",
		ko: "더 알아보기",
		es: "Más información",
		pt: "Saiba mais",
		fr: "Aller plus loin",
		de: "Mehr erfahren",
	},
	"Coming From...": {
		"zh-CN": "从这些平台迁移",
		ja: "他のプラットフォームから移行",
		ko: "다른 플랫폼에서 이전",
		es: "Llegando desde...",
		pt: "Vindo de...",
		fr: "Vous venez de...",
		de: "Umstieg von...",
	},
	Guides: {
		"zh-CN": "指南",
		ja: "ガイド",
		ko: "가이드",
		es: "Guías",
		pt: "Guias",
		fr: "Guides",
		de: "Anleitungen",
	},
	Plugins: {
		"zh-CN": "插件",
		ja: "プラグイン",
		ko: "플러그인",
		es: "Plugins",
		pt: "Plugins",
		fr: "Plugins",
		de: "Plugins",
	},
	Contributing: {
		"zh-CN": "参与贡献",
		ja: "コントリビュート",
		ko: "기여하기",
		es: "Contribuir",
		pt: "Contribuição",
		fr: "Contribution",
		de: "Mitwirken",
	},
	Themes: {
		"zh-CN": "主题",
		ja: "テーマ",
		ko: "테마",
		es: "Temas",
		pt: "Temas",
		fr: "Thèmes",
		de: "Themes",
	},
	Migration: {
		"zh-CN": "迁移",
		ja: "移行",
		ko: "마이그레이션",
		es: "Migración",
		pt: "Migração",
		fr: "Migration",
		de: "Migration",
	},
	Deployment: {
		"zh-CN": "部署",
		ja: "デプロイ",
		ko: "배포",
		es: "Despliegue",
		pt: "Implantação",
		fr: "Déploiement",
		de: "Deployment",
	},
	Concepts: {
		"zh-CN": "概念",
		ja: "概念",
		ko: "개념",
		es: "Conceptos",
		pt: "Conceitos",
		fr: "Concepts",
		de: "Konzepte",
	},
	Reference: {
		"zh-CN": "参考",
		ja: "リファレンス",
		ko: "레퍼런스",
		es: "Referencia",
		pt: "Referência",
		fr: "Référence",
		de: "Referenz",
	},
};

/** @type {import("@astrojs/starlight/types").StarlightUserConfig["sidebar"]} */
const sidebar = [
	{
		label: "Start Here",
		translations: sidebarTranslations["Start Here"],
		items: [
			{ slug: "introduction" },
			{ slug: "getting-started" },
			{ slug: "why-emdash" },
			{ slug: "faq" },
		],
	},
	{
		label: "Learn More",
		translations: sidebarTranslations["Learn More"],
		collapsed: true,
		items: [
			{ slug: "what-is-emdash" },
			{ slug: "best-astro-cms" },
			{ slug: "emdash-vs-wordpress" },
			{ slug: "wordpress-to-astro-with-emdash" },
		],
	},
	{
		label: "Coming From...",
		translations: sidebarTranslations["Coming From..."],
		items: [
			{ slug: "coming-from/wordpress" },
			{ slug: "coming-from/astro-for-wp-devs" },
			{ slug: "coming-from/astro" },
		],
	},
	{
		label: "Guides",
		translations: sidebarTranslations.Guides,
		items: [
			{ slug: "guides/create-a-blog" },
			{ slug: "guides/working-with-content" },
			{ slug: "guides/querying-content" },
			{ slug: "guides/media-library" },
			{ slug: "guides/taxonomies" },
			{ slug: "guides/menus" },
			{ slug: "guides/widgets" },
			{ slug: "guides/page-layouts" },
			{ slug: "guides/sections" },
			{ slug: "guides/site-settings" },
			{ slug: "guides/authentication" },
			{ slug: "guides/ai-tools" },
			{ slug: "guides/x402-payments" },
			{ slug: "guides/preview" },
			{ slug: "guides/internationalization" },
		],
	},
	{
		label: "Plugins",
		translations: sidebarTranslations.Plugins,
		items: [
			{ slug: "plugins/overview" },
			{ slug: "plugins/creating-plugins" },
			{ slug: "plugins/hooks" },
			{ slug: "plugins/storage" },
			{ slug: "plugins/settings" },
			{ slug: "plugins/admin-ui" },
			{ slug: "plugins/block-kit" },
			{ slug: "plugins/api-routes" },
			{ slug: "plugins/sandbox" },
			{ slug: "plugins/publishing" },
			{ slug: "plugins/installing" },
		],
	},
	{
		label: "Contributing",
		translations: sidebarTranslations.Contributing,
		collapsed: true,
		items: [{ slug: "contributing" }],
	},
	{
		label: "Themes",
		translations: sidebarTranslations.Themes,
		items: [
			{ slug: "themes/overview" },
			{ slug: "themes/creating-themes" },
			{ slug: "themes/seed-files" },
			{ slug: "themes/porting-wp-themes" },
		],
	},
	{
		label: "Migration",
		translations: sidebarTranslations.Migration,
		items: [
			{ slug: "migration/from-wordpress" },
			{ slug: "migration/content-import" },
			{ slug: "migration/porting-plugins" },
		],
	},
	{
		label: "Deployment",
		translations: sidebarTranslations.Deployment,
		items: [
			{ slug: "deployment/cloudflare" },
			{ slug: "deployment/nodejs" },
			{ slug: "deployment/database" },
			{ slug: "deployment/storage" },
		],
	},
	{
		label: "Concepts",
		translations: sidebarTranslations.Concepts,
		collapsed: true,
		items: [
			{ slug: "concepts/architecture" },
			{ slug: "concepts/collections" },
			{ slug: "concepts/content-model" },
			{ slug: "concepts/admin-panel" },
		],
	},
	{
		label: "Reference",
		translations: sidebarTranslations.Reference,
		collapsed: true,
		items: [
			{ slug: "reference/configuration" },
			{ slug: "reference/cli" },
			{ slug: "reference/api" },
			{ slug: "reference/field-types" },
			{ slug: "reference/hooks" },
			{ slug: "reference/rest-api" },
			{ slug: "reference/mcp-server" },
		],
	},
];

// https://astro.build/config
export default defineConfig({
	site: resolveSiteUrl(),
	integrations: [
		starlight({
			title: "HiEmdash Docs",
			tagline: "Community-written guides, FAQs, and multilingual translations for EmDash.",
			lastUpdated: true,
			defaultLocale: "root",
			locales: localeLangMap,
			logo: {
				light: "./src/assets/logo-light.svg",
				dark: "./src/assets/logo-dark.svg",
				replacesTitle: true,
			},
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/emdash-cms/emdash",
				},
			],
			components: {
				Head: "./src/components/Head.astro",
			},
			customCss: ["./src/styles/custom.css"],
			sidebar,
		}),
	],

	adapter: cloudflare(),
});
