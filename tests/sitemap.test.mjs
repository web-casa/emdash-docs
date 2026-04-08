import test from "node:test";
import assert from "node:assert/strict";

import { createSitemapLastmodMap } from "../src/lib/sitemap.js";

test("createSitemapLastmodMap maps root and localized docs routes", () => {
	const map = createSitemapLastmodMap();

	assert.ok(map.get("/") instanceof Date);
	assert.ok(map.get("/getting-started/") instanceof Date);
	assert.ok(map.get("/zh-cn/") instanceof Date);
	assert.ok(map.get("/ja/getting-started/") instanceof Date);
});
