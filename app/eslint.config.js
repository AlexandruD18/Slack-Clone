import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist", "node_modules", "migrations"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["client/**/*.{ts,tsx}"],
        languageOptions: { globals: globals.browser },
        plugins: { "react-hooks": reactHooks },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
    },
    {
        files: ["server/**/*.ts", "script/**/*.ts", "shared/**/*.ts", "*.ts", "*.js"],
        languageOptions: { globals: globals.node },
    },
    {
        rules: {
            // Da riportare a "error" con #13 (hardening).
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
            ],
        },
    },
);
