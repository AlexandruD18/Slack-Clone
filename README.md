# Slack Clone

> **Un'implementazione open-source di una piattaforma di messaggistica in tempo reale.** Progetto didattico/prototipale che dimostra l'architettura e le best practice per costruire applicazioni di comunicazione scalabili.

---

## 📋 Metadati del Progetto

| Attributo            | Valore                  |
| -------------------- | ----------------------- |
| **Versione**         | 1.0                     |
| **Data di rilascio** | 19 novembre 2025        |
| **Tipo di progetto** | Didattico/Prototipale   |
| **Licenza**          | Vedi [LICENSE](LICENSE) |

---

## 🎯 Panoramica

**Slack Clone** (Slacklak) è una piattaforma di messaggistica in tempo reale che implementa le funzionalità essenziali di Slack, inclusa una netta separazione tra i componenti backend e frontend.

### Obiettivi del progetto

- 🎓 **Didattico**: Dimostrare i pattern e le architetture per applicazioni di messaggistica scalabili
- 🔧 **Prototipale**: Fornire una base solida per ulteriori sviluppi e sperimentazioni
- 📚 **Documentato**: Includere documentazione tecnica e funzionale completa

### Struttura del repository

```
Slack-Clone/
├── app/                          # Codice sorgente principale
│   ├── client/                   # Frontend (interfaccia web)
│   ├── server/                   # Backend (API e logica server)
│   ├── shared/                   # Modelli e schema condivisi
│   └── [config files]            # Configurazioni (tsconfig, vite, etc.)
├── docs/                         # Documentazione tecnica e funzionale
│   ├── backend/
│   │   ├── analisi-funzionale.md
│   │   ├── analisi-tecnica.md
│   │   └── prd.md
│   └── frontend/
│       ├── analisi-funzionale.md
│       ├── analisi-tecnica.md
│       └── prd.md
└── [config root]                 # File di configurazione repository
```

---

## ✨ Caratteristiche principali

### Autenticazione e autorizzazione

- Autenticazione JWT (JSON Web Token) con supporto OAuth configurabile
- Gestione sicura delle credenziali utente
- Token refresh e session management

### API REST

- Endpoint RESTful per la gestione completa di:
  - **Utenti**: Registrazione, profilo, impostazioni
  - **Canali**: Creazione, modifica, eliminazione
  - **Messaggi**: Invio, modifica, eliminazione, ricerca

### Comunicazione in tempo reale

- WebSocket per aggiornamenti live di messaggi e stato di presenza
- Event-driven architecture per scalabilità

### Modello dati avanzato

- Struttura ottimizzata per canali e thread di conversazione
- Supporto per messaggi diretti (DM) e canali pubblici/privati
- Tracciamento dello stato di presenza degli utenti

### Scalabilità e performance

- Strategie di caching con Redis
- Pub/Sub distribuito per ambienti multi-istanza
- Suggerimenti per deployment su cloud

---

## 🏗️ Architettura del sistema

### Componenti principali

Il backend è organizzato in tre componenti logici principali, ciascuno responsabile di un aspetto specifico del sistema:

#### Gateway / API Server

```
┌─────────────────────────────────────┐
│  HTTP Request Handler               │
│  ├── Request Validation            │
│  ├── JWT Authentication            │
│  └── Route Dispatcher              │
└─────────────────────────────────────┘
```

- Gestisce tutte le richieste HTTP in entrata
- Valida le credenziali e autorizzazioni tramite JWT
- Dirige le richieste ai servizi appropriati
- Gestisce CORS e sicurezza

#### Channel Server

```
┌─────────────────────────────────────┐
│  Channel Orchestration              │
│  ├── Message Persistence           │
│  ├── Thread Management             │
│  └── Notification Dispatch         │
└─────────────────────────────────────┘
```

- Gestisce i canali e la persistenza dei messaggi
- Organizza i messaggi in thread logici
- Coordina l'invio delle notifiche agli utenti connessi
- Implementa la logica di business per la messaggistica

#### Presence Server

```
┌─────────────────────────────────────┐
│  User Presence Management           │
│  ├── Online/Offline Detection      │
│  ├── Activity Tracking             │
│  └── Real-time Status Updates      │
└─────────────────────────────────────┘
```

- Monitora lo stato online/offline degli utenti tramite WebSocket
- Aggiorna in tempo reale lo stato di attività
- Gestisce le disconnessioni e le riconnessioni
- Trasmette gli aggiornamenti di presenza agli altri client

### Flusso di comunicazione

```
┌──────────┐
│  Client  │
└──────────┘
     │
     ├─ HTTP (API REST) ──────────────┐
     │                                 │
     └─ WebSocket (Real-time) ──┐    │
                                 │    │
                    ┌────────────┴────┴──┐
                    │  Gateway/API      │
                    │  Server           │
                    └────────────┬───────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
         ┌──────────────┐  ┌────────────┐  ┌──────────┐
         │ Channel      │  │ Presence   │  │Database  │
         │ Server       │  │ Server     │  │(Persist) │
         └──────────────┘  └────────────┘  └──────────┘
                 │               │               │
                 └───────────────┴───────────────┘
                         │
                    ┌────────────┐
                    │ Redis      │
                    │ (Cache)    │
                    └────────────┘
```

> **Per dettagli architetturali approfonditi**, consultare [docs/backend/analisi-tecnica.md](docs/backend/analisi-tecnica.md).

---

## 🛠️ Stack tecnologico

### Linguaggi e runtime

| Componente           | Opzioni                                          | Note                                   |
| -------------------- | ------------------------------------------------ | -------------------------------------- |
| **Backend**          | Node.js + TypeScript<br/>Python (FastAPI)        | TypeScript consigliato per type safety |
| **Frontend**         | TypeScript + React<br/>(o framework alternativo) | Build tooling con Vite                 |
| **Versione Node.js** | >= 18                                            | Per supporto ES modules moderno        |

### Database e cache

| Servizio       | Ruolo             | Versione minima | Utilizzo                                    |
| -------------- | ----------------- | --------------- | ------------------------------------------- |
| **PostgreSQL** | Database primario | 13+             | Persistenza di utenti, canali, messaggi     |
| **Redis**      | Cache e Pub/Sub   | 6+              | Caching, session store, real-time messaging |

### Comunicazione in tempo reale

| Tecnologia    | Descrizione                                            |
| ------------- | ------------------------------------------------------ |
| **WebSocket** | Protocollo sottostante per comunicazione bidirezionale |
| **socket.io** | Libreria wrapper con fallback e features avanzate      |
| **ws**        | Implementazione WebSocket pura e lightweight           |

### Containerizzazione e orchestrazione

| Strumento          | Utilizzo                                 |
| ------------------ | ---------------------------------------- |
| **Docker**         | Containerizzazione di backend e frontend |
| **Docker Compose** | Orchestrazione locale (dev environment)  |
| **Kubernetes**     | Orchestrazione in produzione (opzionale) |

---

## 📦 Prerequisiti

Prima di iniziare, assicurati di avere installato:

| Requisito          | Versione                   | Scopo                         |
| ------------------ | -------------------------- | ----------------------------- |
| **Node.js**        | >= 18                      | Runtime JavaScript/TypeScript |
| **npm** o **yarn** | Ultima stabile             | Package manager               |
| **Git**            | Qualsiasi versione recente | Version control               |
| **PostgreSQL**     | >= 13                      | Database relazionale          |
| **Redis**          | >= 6                       | Cache e Pub/Sub               |

### Verifica dei prerequisiti

```powershell
# Verificare Node.js
node --version

# Verificare npm
npm --version

# Verificare PostgreSQL (con psql installato)
psql --version

# Verificare Redis (con redis-cli installato)
redis-cli --version
```

---

## 🚀 Setup e installazione

### Fase 1: Clone del repository

```powershell
# Clona il repository
git clone https://github.com/AlexandruD18/slacklak.git
cd slacklak
```

### Fase 2: Configurazione dell'ambiente

#### Opzione A: Utilizzo di Docker Compose (consigliato per dev)

Se disponi di Docker e Docker Compose installati:

```powershell
# Avvia tutti i servizi (PostgreSQL, Redis, Backend, Frontend)
docker-compose up --build

# L'applicazione sarà disponibile a http://localhost:5173 (frontend)
# L'API sarà disponibile a http://localhost:4000
```

#### Opzione B: Installazione locale

Se preferisci installare i servizi manualmente:

```powershell
# 1. Installare dipendenze Node.js
cd app
npm install

# 2. Verificare che PostgreSQL e Redis siano in esecuzione
# (assicurati che i servizi siano avviati)
```

### Fase 3: Configurazione delle variabili d'ambiente

Crea un file `.env` nella root del progetto:

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/slacklak

# Redis
REDIS_URL=redis://localhost:6379

# Autenticazione
JWT_SECRET=your_very_secure_secret_key_here_min_32_chars

# Server
PORT=4000
NODE_ENV=development

# Frontend (optional)
VITE_API_BASE_URL=http://localhost:4000
```

> ⚠️ **Nota sulla sicurezza**: In produzione, utilizza un `JWT_SECRET` complesso e casuale, preferibilmente generato con un password manager.

### Variabili d'ambiente dettagliate

| Variabile           | Tipo   | Descrizione                               | Esempio                                  |
| ------------------- | ------ | ----------------------------------------- | ---------------------------------------- |
| `DATABASE_URL`      | String | Stringa di connessione PostgreSQL         | `postgres://user:pass@localhost:5432/db` |
| `REDIS_URL`         | String | URL di connessione Redis                  | `redis://localhost:6379`                 |
| `JWT_SECRET`        | String | Chiave segreta per JWT (min 32 caratteri) | `your_secret_here`                       |
| `PORT`              | Number | Porta dell'API server                     | `4000`                                   |
| `NODE_ENV`          | String | Ambiente di esecuzione                    | `development`, `production`              |
| `VITE_API_BASE_URL` | String | URL base dell'API per il client           | `http://localhost:4000`                  |

---

## ▶️ Esecuzione e sviluppo

### Start rapido (modalità integrata)

```powershell
cd app
npm run dev
```

Questo comando avvia sia il backend che il frontend in modalità watch.

### Start avanzato (terminali separati)

**Terminale 1 - Backend:**

```powershell
cd app
npm run dev:server
```

**Terminale 2 - Frontend:**

```powershell
cd app
npm run dev:client
```

### Punti di accesso

Una volta avviato il progetto:

- **Frontend web**: http://localhost:5173
- **API Backend**: http://localhost:4000
- **Database PostgreSQL**: localhost:5432
- **Cache Redis**: localhost:6379

### Script utili

| Script             | Comando              | Utilizzo                 |
| ------------------ | -------------------- | ------------------------ |
| Start development  | `npm run dev`        | Avvia backend e frontend |
| Build production   | `npm run build`      | Compila per produzione   |
| Test               | `npm run test`       | Esegue suite di test     |
| Lint               | `npm run lint`       | Verifica codice          |
| Database migration | `npm run db:migrate` | Applica migrazioni DB    |

---

## 📡 API REST

### Panoramica generale

L'API segue il principio RESTful con una struttura gerarchica intuitiva. Tutte le risposte sono in formato JSON.

### Base URL

```
http://localhost:4000/api
```

### Endpoint autenticazione

Gestisce login, registrazione e gestione delle sessioni.

| Metodo | Endpoint         | Descrizione              | Autenticazione |
| ------ | ---------------- | ------------------------ | -------------- |
| `POST` | `/auth/register` | Registra un nuovo utente | No             |
| `POST` | `/auth/login`    | Effettua il login        | No             |
| `POST` | `/auth/refresh`  | Refresh del token JWT    | No             |
| `POST` | `/auth/logout`   | Logout dell'utente       | Sì (JWT)       |

**Esempio - Login:**

```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### Endpoint utenti

Gestisce profili e informazioni degli utenti.

| Metodo | Endpoint              | Descrizione                     | Autenticazione |
| ------ | --------------------- | ------------------------------- | -------------- |
| `GET`  | `/users`              | Elenco di tutti gli utenti      | Sì             |
| `GET`  | `/users/:id`          | Dettagli di un utente specifico | Sì             |
| `PUT`  | `/users/:id`          | Aggiorna profilo utente         | Sì             |
| `GET`  | `/users/:id/presence` | Stato di presenza dell'utente   | Sì             |

### Endpoint canali

Gestisce canali pubblici e privati.

| Metodo   | Endpoint              | Descrizione               | Autenticazione    |
| -------- | --------------------- | ------------------------- | ----------------- |
| `GET`    | `/channels`           | Elenco canali accessibili | Sì                |
| `POST`   | `/channels`           | Crea un nuovo canale      | Sì                |
| `GET`    | `/channels/:id`       | Dettagli di un canale     | Sì                |
| `PUT`    | `/channels/:id`       | Aggiorna canale           | Sì (proprietario) |
| `DELETE` | `/channels/:id`       | Elimina canale            | Sì (proprietario) |
| `POST`   | `/channels/:id/join`  | Unisciti al canale        | Sì                |
| `POST`   | `/channels/:id/leave` | Abbandona il canale       | Sì                |

### Endpoint messaggi

Gestisce messaggi nei canali.

| Metodo   | Endpoint                        | Descrizione           | Autenticazione |
| -------- | ------------------------------- | --------------------- | -------------- |
| `GET`    | `/channels/:id/messages`        | Messaggi del canale   | Sì             |
| `POST`   | `/channels/:id/messages`        | Invia nuovo messaggio | Sì             |
| `PUT`    | `/channels/:id/messages/:msgId` | Modifica messaggio    | Sì (autore)    |
| `DELETE` | `/channels/:id/messages/:msgId` | Elimina messaggio     | Sì (autore)    |

> 📖 **Per specifiche complete**, consultare la documentazione API nel codice o aggiungere uno schema Swagger/OpenAPI.

---

## 🔄 Comunicazione Real-time

### WebSocket events

La comunicazione bidirezionale avviene tramite WebSocket con i seguenti event principali:

#### Messaggistica

```
message:new          - Nuovo messaggio ricevuto
message:update       - Messaggio modificato
message:delete       - Messaggio eliminato
message:read         - Messaggio letto
```

#### Presenza

```
presence:change      - Cambio di stato online/offline
presence:typing      - Utente sta digitando
presence:activity    - Aggiornamento attività
```

#### Notifiche

```
notification:new     - Nuova notifica
notification:dismiss - Notifica dismissal
```

### Pattern di scalabilità

#### Pub/Sub Redis (multi-istanza)

```
┌──────────────┐
│ Client A     │
└──────┬───────┘
       │
┌──────┴─────────────────┐
│  API Server 1          │
│  (WebSocket handler)   │
└──────┬─────────────────┘
       │
    [Redis Pub/Sub]
       │
┌──────┴─────────────────┐
│  API Server 2          │
│  (WebSocket handler)   │
└──────┬─────────────────┘
       │
┌──────┴───────┐
│ Client B     │
└──────────────┘
```

Per ambienti distribuiti, utilizza Redis come broker:

- **Publisher**: Quando riceve un evento, il server lo pubblica su Redis
- **Subscriber**: Tutti i server ascoltano gli eventi e li inviano ai client connessi

> **Questo approccio permette di scalare a migliaia di client distribuiti su più istanze**.

---

## 🌐 Deployment in produzione

### Approccio consigliato

#### Fase 1: Preparazione dell'applicazione

```powershell
# Build frontend
cd app
npm run build

# Preparare backend per produzione
npm run build:server

# Testare in modalità produzione locale
npm run start:prod
```

#### Fase 2: Containerizzazione

Crea immagini Docker per backend e frontend:

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "run", "start"]

# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Fase 3: Configurazione di servizi gestiti

| Servizio                | Provider                                  | Configurazione                       |
| ----------------------- | ----------------------------------------- | ------------------------------------ |
| **Database PostgreSQL** | AWS RDS, Google Cloud SQL, Azure Database | Backup automatici, High availability |
| **Cache Redis**         | AWS ElastiCache, Azure Cache for Redis    | Cluster mode per scalabilità         |
| **Storage di sessioni** | Redis o database                          | Condivisione tra istanze             |

#### Fase 4: Deployment

**Opzione A - Cloud provider (AWS, GCP, Azure):**

```bash
# Configurare ECR/GCR/ACR registry
# Push delle immagini Docker
# Configurare ECS/GKE/ACI per orchestrazione
# Impostare load balancer e auto-scaling
```

**Opzione B - PaaS (Heroku, Render, Railway):**

```bash
# Configurare git repository
# Push del codice
# Configurare environment variables
# Deploy automatico
```

#### Fase 5: Post-deployment

- ✅ Configurare domain e SSL/TLS
- ✅ Impostare monitoring (CloudWatch, DataDog, etc.)
- ✅ Configurare logging centralizzato
- ✅ Impostare backup automatici del database
- ✅ Configurare auto-scaling basato su metriche
- ✅ Testare failover e disaster recovery

### Checklist di sicurezza

- [ ] JWT_SECRET è casuale e complesso (min 32 caratteri)
- [ ] Database password è crittografia e ruotata periodicamente
- [ ] CORS è configurato per domini specifici (non '\*')
- [ ] Rate limiting è implementato sugli endpoint pubblici
- [ ] HTTPS/TLS è abilitato
- [ ] WAF (Web Application Firewall) è configurato
- [ ] Logging e auditing sono attivi
- [ ] Secrets sono gestiti con vault (AWS Secrets Manager, etc.)

---

## 🧪 Testing

L'applicazione include una suite di test per garantire la qualità del codice:

```powershell
# Eseguire tutti i test
npm run test

# Test con coverage
npm run test:coverage

# Test in watch mode (sviluppo)
npm run test:watch

# Test E2E
npm run test:e2e
```

---

## 📚 Documentazione

La documentazione completa del progetto è disponibile nella cartella `docs/`:

| Documento                                                                  | Descrizione                                  |
| -------------------------------------------------------------------------- | -------------------------------------------- |
| [docs/backend/analisi-funzionale.md](docs/backend/analisi-funzionale.md)   | Requisiti funzionali del backend             |
| [docs/backend/analisi-tecnica.md](docs/backend/analisi-tecnica.md)         | Architettura e design technical del backend  |
| [docs/backend/prd.md](docs/backend/prd.md)                                 | Product Requirements Document                |
| [docs/frontend/analisi-funzionale.md](docs/frontend/analisi-funzionale.md) | Requisiti funzionali del frontend            |
| [docs/frontend/analisi-tecnica.md](docs/frontend/analisi-tecnica.md)       | Architettura e design technical del frontend |
| [docs/frontend/prd.md](docs/frontend/prd.md)                               | Product Requirements Document                |

---

## 🤝 Contribuire al progetto

Apprezziamo i contributi dalla comunità! Segui questi passaggi per contribuire:

### 1. Fork e clone

```powershell
# Fai un fork del repository su GitHub
# Quindi clona il tuo fork
git clone https://github.com/YOUR_USERNAME/slacklak.git
cd slacklak
```

### 2. Crea una feature branch

```powershell
# Crea una branch per la tua feature
git checkout -b feature/descrizione-feature

# Oppure per bugfix
git checkout -b bugfix/descrizione-bug
```

### 3. Apporta le modifiche

```powershell
# Modifica il codice
# Assicurati di seguire lo style guide
npm run lint

# Esegui i test
npm run test
```

### 4. Commit e push

```powershell
# Commit con messaggi descrittivi
git commit -m "feat: aggiungi nuova funzionalità"
git push origin feature/descrizione-feature
```

### 5. Apri una Pull Request

- Naviga al repository originale su GitHub
- Clicca su "New Pull Request"
- Descrivi le tue modifiche in dettaglio
- Includi eventuali screenshot o video

### Linee guida per i contributi

- ✅ Seguire lo stile di codice del progetto
- ✅ Scrivere test per nuove funzionalità
- ✅ Aggiornare la documentazione se necessario
- ✅ Scrivere commit messages chiari e descrittivi
- ✅ Non includere file di configurazione personali

> Per il codice di condotta e le linee guida dettagliate, consulta `CONTRIBUTING.md` se presente.

---

## 📄 Licenza

Questo progetto è distribuito sotto la licenza specificata nel file [LICENSE](LICENSE).

Per dettagli su come utilizzare il codice in progetti commerciali o privati, consulta il file di licenza.

---

## 📞 Supporto e contatti

### Segnalare bug o problemi

1. Controlla se il problema è già stato segnalato nelle [Issues](../../issues)
2. Se non esiste, crea una nuova issue con:
   - Titolo descrittivo
   - Descrizione dettagliata del problema
   - Passaggi per riprodurre il bug
   - Screenshot/video se applicabile
   - Versione di Node.js e OS

### Proporre nuove funzionalità

- Apri una issue con il tag `enhancement`
- Descrivi il caso d'uso e il valore della feature
- Fornisci esempi se possibile

### Contattare i maintainer

- Apri una issue etichettata come `question` per domande generali
- Consulta la documentazione in `docs/` per risposte tecniche

---

## 🎓 Risorse aggiuntive

### Documentazione tecnica

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

### WebSocket e Real-time

- [Socket.io Documentation](https://socket.io/docs/)
- [WebSocket Protocol (RFC 6455)](https://tools.ietf.org/html/rfc6455)

### Deploy e DevOps

- [Docker Getting Started](https://docs.docker.com/get-started/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

**Ultimo aggiornamento**: 19 novembre 2025
**Versione documentazione**: 1.0
