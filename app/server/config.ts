import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL è obbligatoria"),
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET deve avere almeno 32 caratteri (es. `openssl rand -hex 32`)")
        .refine(
            (value) => !/your|example|change|secret_key|here/i.test(value),
            "JWT_SECRET sembra un segnaposto copiato dalla documentazione: generane uno casuale",
        ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const problems = parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
    console.error(`Configurazione non valida. Controlla il file .env:\n${problems}`);
    process.exit(1);
}

export const config = parsed.data;
