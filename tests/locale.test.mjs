import test from "node:test";
import assert from "node:assert/strict";

import {
	DEFAULT_LOCALE,
	detectPreferredLocale,
	detectPreferredLocaleFromLanguages,
	getLocalePath,
	localeFromPath,
	resolvePreferredLocale,
} from "../src/lib/locale.js";

test("detectPreferredLocale respects q values and ordering", () => {
	assert.equal(
		detectPreferredLocale("en-US,en;q=0.9,zh-CN;q=0.8"),
		DEFAULT_LOCALE,
	);
	assert.equal(
		detectPreferredLocale("zh-CN,zh;q=0.9,en;q=0.8"),
		"zh-cn",
	);
});

test("resolvePreferredLocale prefers a supported stored locale", () => {
	assert.equal(
		resolvePreferredLocale({
			storedLocale: "zh-cn",
			acceptLanguage: "en-US,en;q=0.9",
		}),
		"zh-cn",
	);
	assert.equal(
		resolvePreferredLocale({
			storedLocale: "invalid",
			acceptLanguage: "en-US,en;q=0.9",
		}),
		DEFAULT_LOCALE,
	);
});

test("localeFromPath and getLocalePath round-trip configured locales", () => {
	assert.equal(localeFromPath("/"), DEFAULT_LOCALE);
	assert.equal(localeFromPath("/getting-started/"), DEFAULT_LOCALE);
	assert.equal(localeFromPath("/zh-cn"), "zh-cn");
	assert.equal(localeFromPath("/zh-cn/getting-started/"), "zh-cn");
	assert.equal(localeFromPath("/ja/getting-started/"), "ja");
	assert.equal(getLocalePath("zh-cn"), "/zh-cn/");
	assert.equal(getLocalePath("ja"), "/ja/");
});

test("detectPreferredLocaleFromLanguages matches browser language arrays", () => {
	assert.equal(
		detectPreferredLocaleFromLanguages(["en-US", "zh-CN"]),
		DEFAULT_LOCALE,
	);
	assert.equal(
		detectPreferredLocaleFromLanguages(["zh-Hans-CN", "en-US"]),
		"zh-cn",
	);
	assert.equal(
		detectPreferredLocaleFromLanguages(["ja-JP", "en-US"]),
		"ja",
	);
});
