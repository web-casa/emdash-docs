import { defineMiddleware } from "astro:middleware";
import {
	COOKIE_MAX_AGE,
	LOCALE_COOKIE,
	getLocalePath,
	getRootLocaleAliasTarget,
	localeFromPath,
	resolvePreferredLocale,
} from "./lib/locale.js";

function isDocumentPath(pathname: string) {
	return !pathname.includes(".") && !pathname.startsWith("/_astro");
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	const rootLocaleAliasTarget = getRootLocaleAliasTarget(pathname);

	if (rootLocaleAliasTarget) {
		const redirectUrl = new URL(rootLocaleAliasTarget, context.url);
		redirectUrl.search = context.url.search;
		const response = context.redirect(redirectUrl.toString(), 301);
		context.cookies.set(LOCALE_COOKIE, "root", {
			path: "/",
			maxAge: COOKIE_MAX_AGE,
			sameSite: "lax",
			httpOnly: false,
		});
		return response;
	}

	if (pathname === "/") {
		const preferredLocale = resolvePreferredLocale({
			storedLocale: context.cookies.get(LOCALE_COOKIE)?.value,
			acceptLanguage: context.request.headers.get("accept-language"),
		});

		if (preferredLocale !== "root") {
			const response = context.redirect(getLocalePath(preferredLocale), 302);
			context.cookies.set(LOCALE_COOKIE, preferredLocale, {
				path: "/",
				maxAge: COOKIE_MAX_AGE,
				sameSite: "lax",
				httpOnly: false,
			});
			return response;
		}
	}

	const response = await next();

	if (!isDocumentPath(pathname)) {
		return response;
	}

	const locale = localeFromPath(pathname);
	context.cookies.set(LOCALE_COOKIE, locale, {
		path: "/",
		maxAge: COOKIE_MAX_AGE,
		sameSite: "lax",
		httpOnly: false,
	});

	return response;
});
