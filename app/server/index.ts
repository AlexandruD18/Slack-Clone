import { config } from "./config";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { createServer } from "http";
import { pool } from "./db";
import { HttpError, logError } from "./http-utils";
import { setupRealtime } from "./realtime";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { storage } from "./storage";

const isProduction = config.NODE_ENV === "production";

const app = express();
const httpServer = createServer(app);

// Dietro un proxy (Render, Fly, nginx…) serve per leggere l'IP vero nei limiti di richieste.
app.set("trust proxy", config.TRUST_PROXY);
app.disable("x-powered-by");

app.use(
    helmet({
        // In sviluppo Vite inietta script inline per l'aggiornamento a caldo.
        contentSecurityPolicy: isProduction
            ? {
                  directives: {
                      defaultSrc: ["'self'"],
                      connectSrc: ["'self'", "ws:", "wss:"],
                      imgSrc: ["'self'", "data:", "https:"],
                      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                      fontSrc: ["'self'", "https://fonts.gstatic.com"],
                      objectSrc: ["'none'"],
                      frameAncestors: ["'none'"],
                      // L'HTTPS lo gestisce il proxy del deploy: forzarlo qui romperebbe i test in HTTP.
                      upgradeInsecureRequests: null,
                  },
              }
            : false,
        referrerPolicy: { policy: "no-referrer" },
    }),
);

app.use(express.json({ limit: "100kb" }));

export function log(message: string, source = "express") {
    const time = new Date().toLocaleTimeString("it-IT");
    console.log(`${time} [${source}] ${message}`);
}

// Registra solo metodo, percorso, stato e durata: il corpo può contenere token e messaggi privati.
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
        if (path.startsWith("/api")) {
            // Il token degli inviti è una credenziale: nei log resta solo il segnaposto.
            const safePath = path.replace(/^\/api\/invites\/[^/]+/, "/api/invites/:token");
            log(`${req.method} ${safePath} ${res.statusCode} in ${Date.now() - start}ms`);
        }
    });

    next();
});

// Per i controlli del deploy: risponde 200 solo se il database è raggiungibile.
app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("select 1");
        res.json({ status: "ok" });
    } catch {
        res.status(503).json({ status: "unavailable" });
    }
});

registerRoutes(app);
setupRealtime(httpServer);

(async () => {
    // Le route catch-all del client vanno dopo le API, altrimenti le intercettano.
    if (isProduction) {
        serveStatic(app);
    } else {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
    }

    // Gestore finale degli errori: risponde e registra, senza far cadere il processo.
    app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) return next(err);

        if (err instanceof HttpError) {
            return res.status(err.status).json({ message: err.message });
        }
        // Errori di express.json (JSON malformato, corpo troppo grande) hanno già uno stato 4xx.
        const status =
            typeof err === "object" && err !== null && "status" in err ? Number(err.status) : 500;
        if (status >= 400 && status < 500) {
            return res.status(status).json({
                message: status === 413 ? "Richiesta troppo grande" : "Richiesta non valida",
            });
        }

        logError(`${req.method} ${req.path}`, err);
        res.status(500).json({
            message: isProduction
                ? "Qualcosa è andato storto. Riprova tra poco."
                : err instanceof Error
                  ? err.message
                  : "Errore interno",
        });
    });

    await storage.resetPresence();

    httpServer.listen({ port: config.PORT, host: "0.0.0.0" }, () => {
        log(`in ascolto sulla porta ${config.PORT}`);
    });
})().catch((error) => {
    logError("Avvio del server", error);
    process.exit(1);
});

function shutdown(signal: string) {
    log(`${signal} ricevuto, chiudo il server`);
    httpServer.close(() => {
        pool.end().finally(() => process.exit(0));
    });
    // Se qualche connessione resta aperta, esco comunque dopo 10 secondi.
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
