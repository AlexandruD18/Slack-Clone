import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Serve il client compilato da `dist/public`. Nel bundle di produzione
 * `import.meta.dirname` diventa la cartella di `dist/index.cjs` (vedi script/build.ts).
 */
export function serveStatic(app: Express) {
    const distPath = path.resolve(import.meta.dirname, "public");

    if (!fs.existsSync(distPath)) {
        throw new Error(
            `Cartella del client non trovata: ${distPath}. Esegui prima npm run build.`,
        );
    }

    app.use(express.static(distPath, { index: false, maxAge: "1h" }));

    // Le API sconosciute rispondono 404 in JSON invece di restituire la pagina dell'app.
    app.use("/api", (_req, res) => {
        res.status(404).json({ message: "Not found" });
    });

    app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
