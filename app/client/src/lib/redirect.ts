/**
 * Percorso a cui tornare dopo il login, letto da `?next=`.
 * Accetta solo percorsi interni: niente `//altro-sito` né URL assoluti (open redirect).
 */
export function safeNextPath(search: string): string {
    const next = new URLSearchParams(search).get("next");
    if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
        return "/";
    }
    return next;
}
