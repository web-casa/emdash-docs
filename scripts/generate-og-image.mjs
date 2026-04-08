import path from "node:path";

import sharp from "sharp";

const input = path.resolve("public/og-image.svg");
const output = path.resolve("public/og-image.png");

await sharp(input)
	.png({
		compressionLevel: 9,
		quality: 100,
	})
	.toFile(output);

console.log(`Generated ${output}`);
