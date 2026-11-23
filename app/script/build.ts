import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Dipendenze del server incluse nel bundle: riducono i file da aprire all'avvio.
const allowlist = [
    "date-fns",
    "drizzle-orm",
    "drizzle-zod",
    "express",
    "jsonwebtoken",
    "ws",
    "zod",
    "zod-validation-error",
];

async function buildAll() {
    await rm("dist", { recursive: true, force: true });

    console.log("building client...");
    await viteBuild();

    console.log("building server...");
    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    const allDeps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
    ];
    const externals = allDeps.filter((dep) => !allowlist.includes(dep));

    await esbuild({
        entryPoints: ["server/index.ts"],
        platform: "node",
        bundle: true,
        format: "cjs",
        outfile: "dist/index.cjs",
        define: {
            "process.env.NODE_ENV": '"production"',
            // Nel formato CommonJS import.meta è vuoto: lo sostituisco con __dirname.
            "import.meta.dirname": "__dirname",
        },
        minify: true,
        external: externals,
        logLevel: "info",
    });
}

buildAll().catch((err) => {
    console.error(err);
    process.exit(1);
});
