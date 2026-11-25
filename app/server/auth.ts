import type { NextFunction, Request, Response } from "express";
import { hashSync } from "bcrypt";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { config } from "./config";

export const BCRYPT_COST = 10;
/** Hash di una stringa casuale con lo stesso costo: i tempi del login non rivelano chi è registrato. */
export const DUMMY_HASH = hashSync(randomUUID(), BCRYPT_COST);

export interface TokenUser {
    id: string;
    email: string;
    name: string;
}

export interface AuthenticatedRequest extends Request {
    user?: TokenUser;
}

export function signToken(user: TokenUser) {
    return jwt.sign({ id: user.id, email: user.email, name: user.name }, config.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: "7d",
    });
}

/** Restituisce l'utente del token, oppure undefined se il token manca, è scaduto o è falso. */
export function verifyToken(token: unknown): TokenUser | undefined {
    if (typeof token !== "string" || token.length === 0) return undefined;
    try {
        const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] });
        if (typeof decoded !== "object" || typeof decoded.id !== "string") return undefined;
        return { id: decoded.id, email: decoded.email, name: decoded.name };
    } catch {
        return undefined;
    }
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Accesso richiesto" });
    }
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ message: "Sessione scaduta: accedi di nuovo" });
    }
    req.user = user;
    next();
}

/** Da usare solo dopo authenticateToken. */
export function currentUserId(req: AuthenticatedRequest): string {
    return req.user!.id;
}
