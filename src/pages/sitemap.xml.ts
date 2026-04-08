import { resolveSiteUrl } from "../lib/site-config.js";

export function GET() {
	const siteUrl = resolveSiteUrl();
	const targetUrl = new URL("/sitemap-index.xml", siteUrl).toString();

	return Response.redirect(targetUrl, 301);
}
