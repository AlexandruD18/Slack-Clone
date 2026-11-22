#!/usr/bin/env bash
# Prepara l'applicazione su un server. Richiede un file .env (vedi .env.example).
set -euo pipefail

echo "1. Installo le dipendenze"
npm ci

echo "2. Compilo client e server"
npm run build

echo "3. Aggiorno lo schema del database"
npm run db:push

echo "Fatto. Avvia con: npm start"
