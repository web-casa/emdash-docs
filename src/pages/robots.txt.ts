import { resolveSiteUrl } from "../lib/site-config.js";

export function GET() {
	const siteUrl = resolveSiteUrl();
	const sitemapUrl = new URL("/sitemap.xml", siteUrl).toString();

	return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
