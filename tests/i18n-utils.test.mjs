import test from "node:test";
import assert from "node:assert/strict";

import { findSuspiciousEnglish, rewriteInternalLinks } from "../scripts/lib/i18n-utils.mjs";

test("rewriteInternalLinks prefixes root links for the active locale only", () => {
	const input = [
		"[root](/getting-started/)",
		"[ja](/ja/getting-started/)",
		"[zh](/zh-cn/getting-started/)",
		'<a href="/reference/api/">API</a>',
	].join("\n");

	const output = rewriteInternalLinks(input, "zh-cn");

	assert.match(output, /\[root\]\(\/zh-cn\/getting-started\/\)/);
	assert.match(output, /\[ja\]\(\/ja\/getting-started\/\)/);
	assert.match(output, /\[zh\]\(\/zh-cn\/getting-started\/\)/);
	assert.match(output, /href="\/zh-cn\/reference\/api\/"/);
});

test("findSuspiciousEnglish ignores normal Spanish and German prose", () => {
	const spanish =
		"EmDash admite varios motores de base de datos. Elige el que mejor encaje con tu entorno de despliegue.";
	const german =
		"EmDash unterstützt mehrere Datenbank-Backends. Wählen Sie die passende Option für Ihr Deployment-Ziel.";

	assert.deepEqual(findSuspiciousEnglish(spanish), []);
	assert.deepEqual(findSuspiciousEnglish(german), []);
});

test("findSuspiciousEnglish flags actual English prose fragments", () => {
	const content = [
		"Configuración opcional.",
		"Build the tarball and publish in one step.",
	].join(" ");

	assert.deepEqual(findSuspiciousEnglish(content), ["Build the tarball and publish in one step"]);
});
