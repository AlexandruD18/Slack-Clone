import { config } from "./config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

type HttpError = Error & { status?: number; statusCode?: number };

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: "100kb" }));

export function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    console.log(`${formattedTime} [${source}] ${message}`);
}

// Registra solo metodo, percorso, stato e durata: il corpo può contenere token e messaggi privati.
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
        if (path.startsWith("/api")) {
            log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
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

(async () => {
    await registerRoutes(httpServer, app);

    // Le route catch-all del client vanno dopo le API, altrimenti le intercettano.
    if (config.NODE_ENV === "production") {
        serveStatic(app);
    } else {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
    }

    // Gestore finale degli errori: risponde e registra, senza far cadere il processo.
    app.use((err: HttpError, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        if (status >= 500) {
            console.error(err);
        }
        if (res.headersSent) {
            return next(err);
        }
        // In produzione i dettagli degli errori interni restano nei log.
        const message =
            status >= 500 && config.NODE_ENV === "production"
                ? "Internal Server Error"
                : err.message || "Internal Server Error";
        res.status(status).json({ message });
    });

    httpServer.listen({ port: config.PORT, host: "0.0.0.0" }, () => {
        log(`serving on port ${config.PORT}`);
    });
})();

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
