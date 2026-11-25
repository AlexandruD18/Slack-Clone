import { z } from "zod";

/**
 * Regole di validazione condivise tra client e server.
 * Il client le usa per i messaggi nei form, il server per rifiutare qualsiasi richiesta
 * che non le rispetti: i limiti valgono anche per chi chiama le API direttamente.
 */

export const LIMITS = {
    emailMax: 254,
    passwordMin: 8,
    passwordMax: 128,
    nameMin: 2,
    nameMax: 80,
    channelNameMax: 80,
    descriptionMax: 250,
    messageMax: 4000,
    statusMessageMax: 140,
    avatarUrlMax: 2048,
} as const;

const email = z
    .string()
    .trim()
    .toLowerCase()
    .max(LIMITS.emailMax, "L'email è troppo lunga")
    .pipe(z.email("Inserisci un indirizzo email valido"));

const personName = z
    .string()
    .trim()
    .min(LIMITS.nameMin, `Il nome deve avere almeno ${LIMITS.nameMin} caratteri`)
    .max(LIMITS.nameMax, `Il nome può avere al massimo ${LIMITS.nameMax} caratteri`);

export const loginSchema = z.object({
    email,
    // Al login non serve il minimo: una password sbagliata riceve la stessa risposta.
    password: z.string().min(1, "Inserisci la password").max(LIMITS.passwordMax),
});

export const registerSchema = z.object({
    email,
    password: z
        .string()
        .min(LIMITS.passwordMin, `La password deve avere almeno ${LIMITS.passwordMin} caratteri`)
        .max(
            LIMITS.passwordMax,
            `La password può avere al massimo ${LIMITS.passwordMax} caratteri`,
        ),
    name: personName,
});

export const workspaceSchema = z.object({
    name: personName,
});

/** "Marketing Italia" diventa "marketing-italia". */
export function normalizeChannelName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export const channelSchema = z.object({
    name: z
        .string()
        .transform(normalizeChannelName)
        .pipe(
            z
                .string()
                .min(2, "Il nome del canale deve avere almeno 2 caratteri")
                .max(LIMITS.channelNameMax, "Il nome del canale è troppo lungo")
                .regex(
                    /^[a-z0-9à-ù][a-z0-9à-ù_-]*$/,
                    "Usa solo lettere minuscole, numeri, trattini e trattini bassi",
                ),
        ),
    description: z
        .string()
        .trim()
        .max(LIMITS.descriptionMax, "La descrizione è troppo lunga")
        .nullish()
        .transform((value) => value || null),
    isPrivate: z.boolean(),
});

export const messageSchema = z.object({
    content: z
        .string()
        .trim()
        .min(1, "Il messaggio è vuoto")
        .max(LIMITS.messageMax, `Il messaggio può avere al massimo ${LIMITS.messageMax} caratteri`),
});

export const profileSchema = z
    .object({
        name: personName.optional(),
        avatar: z
            .url({ protocol: /^https$/, error: "L'avatar deve essere un indirizzo https" })
            .max(LIMITS.avatarUrlMax)
            .nullable()
            .optional(),
        statusMessage: z
            .string()
            .trim()
            .max(LIMITS.statusMessageMax, "Lo stato è troppo lungo")
            .nullable()
            .optional(),
    })
    .strict();

export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type ChannelInput = z.input<typeof channelSchema>;
