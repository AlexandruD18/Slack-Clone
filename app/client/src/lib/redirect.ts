/**
 * Percorso a cui tornare dopo il login, letto da `?next=`.
 * Lo risolvo come URL rispetto all'origine attuale e lo accetto solo se resta su
 * questa origine: `//altro-sito`, `/\\altro-sito` o `/%09/altro-sito` tornano alla home.
 */
export function safeNextPath(search: string, origin = window.location.origin): string {
    const next = new URLSearchParams(search).get("next");
    if (!next || !next.startsWith("/")) return "/";
    try {
        const url = new URL(next, origin);
        if (url.origin !== origin) return "/";
        return url.pathname + url.search + url.hash;
    } catch {
        return "/";
    }
}
