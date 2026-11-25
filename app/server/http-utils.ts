import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { z } from "zod";

/** Errore con stato HTTP: le route lo lanciano, il gestore finale lo trasforma in risposta. */
export class HttpError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

/** Convalida un input con uno schema zod; se non va, risponde 400 con il primo messaggio. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
    const result = schema.safeParse(input);
    if (!result.success) {
        throw new HttpError(400, result.error.issues[0]?.message ?? "Dati non validi");
    }
    return result.data;
}

/** Inoltra al gestore degli errori anche le eccezioni delle funzioni async (Express 4 non lo fa). */
export function route<R extends Request = Request>(
    handler: (req: R, res: Response) => Promise<unknown>,
): RequestHandler {
    return (req, res, next: NextFunction) => {
        handler(req as R, res).catch(next);
    };
}

/** Errore Postgres 23505: violazione di un vincolo di unicità. */
export function isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

/**
 * Registra un errore senza i dettagli di Postgres: il campo `detail` di pg contiene
 * i valori della riga (per esempio l'email di un vincolo unico violato).
 */
export function logError(context: string, error: unknown) {
    if (error instanceof Error) {
        const code = "code" in error ? ` [${String(error.code)}]` : "";
        console.error(`${context}: ${error.name}${code}: ${error.message}\n${error.stack ?? ""}`);
    } else {
        console.error(`${context}:`, error);
    }
}
