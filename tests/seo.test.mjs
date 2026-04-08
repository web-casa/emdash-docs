import test from "node:test";
import assert from "node:assert/strict";

import { buildBreadcrumbJsonLd, getSocialImageAlt } from "../src/lib/seo.js";
import { FALLBACK_SITE_URL, resolveSiteUrl } from "../src/lib/site-config.js";

test("buildBreadcrumbJsonLd keeps the homepage breadcrumb minimal", () => {
	const payload = buildBreadcrumbJsonLd({
		site: "https://example.com",
		pathname: "/",
		pageTitle: "HiEmdash Docs",
		locale: "root",
	});

	assert.deepEqual(payload.itemListElement.map((item) => item.name), ["Home"]);
});

test("buildBreadcrumbJsonLd includes a localized section crumb for nested docs", () => {
	const englishPayload = buildBreadcrumbJsonLd({
		site: "https://example.com",
		pathname: "/guides/preview/",
		pageTitle: "Preview Mode",
		locale: "root",
	});
	const chinesePayload = buildBreadcrumbJsonLd({
		site: "https://example.com",
		pathname: "/zh-cn/guides/preview/",
		pageTitle: "预览模式",
		locale: "zh-cn",
	});

	assert.deepEqual(englishPayload.itemListElement.map((item) => item.name), [
		"Home",
		"Guides",
		"Preview Mode",
	]);
	assert.deepEqual(chinesePayload.itemListElement.map((item) => item.name), [
		"首页",
		"指南",
		"预览模式",
	]);
});

test("SEO helpers localize social image alt text and resolve the site URL from env", () => {
	assert.equal(
		getSocialImageAlt("zh-cn"),
		"HiEmdash Docs，一个社区维护的 EmDash 多语言文档站点。",
	);
	assert.equal(
		resolveSiteUrl({ SITE_URL: "https://example.com/" }),
		"https://example.com",
	);
	assert.equal(
		resolveSiteUrl({ SITE_URL: "not a url" }),
		FALLBACK_SITE_URL,
	);
});
