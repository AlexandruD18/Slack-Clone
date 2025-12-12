# Guida Avvio Progetto Slack-Clone 🚀

Questa guida ti accompagna passo per passo per clonare la repository, configurare PostgreSQL via Docker e avviare l'applicazione (server + client) in locale su Windows.

—

## Prerequisiti

- Node.js ≥ 18 (consigliato LTS)
- npm ≥ 9
- Docker Desktop installato e in esecuzione
- Git installato
- VS Code

Suggerimento: verifica le versioni con:

```bash
node -v
npm -v
git --version
```

—

## 1) Clona la repository e apri il progetto

Apri un terminale nella cartella dove vuoi salvare il progetto, poi:

```bash
git clone <link-repository>
cd Slack-Clone
code .
```

Note:

- `code .` apre il progetto direttamente in VS Code.
- Se il nome della cartella non è `Slack-Clone`, sostituiscilo con quello corretto dopo il clone.

—

## 2) Installa le dipendenze

Installa le librerie per server e client usando due terminali separati (oppure uno solo, navigando tra le cartelle).

Server:

```bash
cd server
npm install
```

Client (in un nuovo terminale o tornando indietro con `cd ..`):

```bash
cd client
npm install
```

—

## 3) Avvia il database PostgreSQL (Docker)

Useremo PostgreSQL in Docker, in ascolto sulla porta host `5433` (mappata sulla `5432` del container). Avvia Docker Desktop, poi esegui:

```bash
docker run --name slack-db -p 5433:5432 -e POSTGRES_USER=teamslack -e POSTGRES_PASSWORD=teamslack -e POSTGRES_DB=slacklak -d postgres:alpine
```

Note:

- Se il nome `slack-db` è già in uso, avvia il container esistente dalla dashboard di Docker (pallino verde = in esecuzione).
- Per riavvio rapido: `docker start slack-db`
- Per verificare: `docker ps` (controlla che `slack-db` sia "Up")

—

## 4) Configura le variabili ambiente

Assicurati che il server punti al database sulla porta `5433`. Se il progetto richiede un file `.env`, crea (o aggiorna) nella root della cartella `server` un file `.env` con valori coerenti. Esempio:

```env
# Server
PORT=4000
NODE_ENV=development

# Database (PostgreSQL via Docker)
DB_HOST=localhost
DB_PORT=5433
DB_USER=teamslack
DB_PASSWORD=teamslack
DB_NAME=slacklak

# CORS / Client
CLIENT_URL=http://localhost:5173
```

Se il progetto usa Drizzle/ORM, verifica anche `app/drizzle.config.ts` e `server/db.ts` per coerenza con queste variabili.

—

## 5) Avvia l'applicazione (due terminali)

Avvia server e client in parallelo.

Terminale 1 — Server (dalla cartella `server`):

```bash
npm run dev
```

Terminale 2 — Client (dalla cartella `client`):

```bash
npm run dev
```

Punti di accesso usuali:

- API server: http://localhost:4000 (o come configurato in `.env`)
- Frontend: http://localhost:5173

—

## 6) Verifica rapida

- Frontend: apri il browser su `http://localhost:5173`
- Login/Signup: esegui un flusso base per verificare la connessione
- Canali/DM: accedi a un canale e invia un messaggio di prova

—

## 7) Troubleshooting

- Porta occupata (5433):
  - Cambia mapping `-p 5434:5432` nel comando Docker e aggiorna `DB_PORT=5434` nel `.env`.
- Il container non parte:
  - Controlla Docker Desktop sia avviato.
  - `docker logs slack-db` per vedere log di errore.
- Errore di connessione al DB:
  - Verifica `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
  - Testa con un client PostgreSQL (es. DBeaver) usando gli stessi valori.
- Il client non si connette all'API:
  - Verifica `CLIENT_URL` e CORS lato server.
  - Controlla che il server sia effettivamente su `http://localhost:4000`.
- Problemi su Windows (PowerShell):
  - Esegui i comandi in PowerShell o Git Bash.
  - Se `code` non è riconosciuto, aggiungi VS Code al PATH o apri manualmente.

—

## 8) Comandi utili

Arresta e rimuovi il DB (attenzione: dati persi):

```bash
docker stop slack-db
docker rm slack-db
```

Ricrea il DB pulito:

```bash
docker run --name slack-db -p 5433:5432 -e POSTGRES_USER=teamslack -e POSTGRES_PASSWORD=teamslack -e POSTGRES_DB=slacklak -d postgres:alpine
```

Lista container attivi:

```bash
docker ps
```

—

## 9) Suggerimenti di qualità

- Mantieni `.env` fuori dal VCS se contiene segreti.
- Usa un tool DB (DBeaver/Beekeeper) per ispezionare tabelle.
- Valuta `npm run build` sul client per testare la build production.
- Se disponibile, esegui migrazioni ORM prima di avviare il server (Drizzle/Knex).

—

## Riferimenti

- Documentazione PostgreSQL Docker: https://hub.docker.com/_/postgres
- Documentazione Vite: https://vitejs.dev/
- Documentazione React: https://react.dev/
- Docker Desktop: https://www.docker.com/products/docker-desktop
