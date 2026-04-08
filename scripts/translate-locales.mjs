import { spawn } from "node:child_process";

import { parseArgs } from "./lib/i18n-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const locales = String(args.locales ?? "ja,ko,es,pt,fr,de")
	.split(",")
	.map((value) => value.trim().toLowerCase())
	.filter(Boolean);
const concurrency = String(args.concurrency ?? "2");
const validate = args.validate !== "false";
const model = args.model ? String(args.model) : null;
const review = args.review !== "false";

function runStep(command, commandArgs) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, commandArgs, {
			cwd: process.cwd(),
			stdio: "inherit",
			env: process.env,
		});

		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`${command} ${commandArgs.join(" ")} exited with code ${code}`));
		});
	});
}

async function runLocale(locale) {
	const translateArgs = [
		"./scripts/translate-deepseek.mjs",
		"--locale",
		locale,
		"--concurrency",
		concurrency,
	];

	if (model) {
		translateArgs.push("--model", model);
	}

	if (!review) {
		translateArgs.push("--review", "false");
	}

	console.log(`\n==> translate ${locale}`);
	await runStep("node", translateArgs);

	if (!validate) {
		return;
	}

	console.log(`\n==> validate ${locale}`);
	await runStep("node", ["./scripts/validate-translations.mjs", "--locale", locale]);
}

async function main() {
	if (locales.length === 0) {
		throw new Error("Missing locales. Example: --locales ja,ko,es");
	}

	const failures = [];

	for (const locale of locales) {
		try {
			await runLocale(locale);
		} catch (error) {
			failures.push({ locale, error });
			console.error(`\nLocale failed: ${locale}`);
			console.error(error);
		}
	}

	if (failures.length > 0) {
		console.error("\nTranslation summary:");
		for (const failure of failures) {
			console.error(`- ${failure.locale}: ${failure.error.message}`);
		}
		process.exitCode = 1;
		return;
	}

	console.log(`\nCompleted locales: ${locales.join(", ")}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
