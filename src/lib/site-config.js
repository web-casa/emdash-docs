export const FALLBACK_SITE_URL = "https://docs.hiemdash.com";

export function resolveSiteUrl(env = process.env) {
	const candidate = env.SITE_URL ?? env.PUBLIC_SITE_URL ?? FALLBACK_SITE_URL;

	try {
		return new URL(candidate).toString().replace(/\/$/, "");
	} catch {
		return FALLBACK_SITE_URL;
	}
}
