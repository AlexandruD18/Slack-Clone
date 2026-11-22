# Revisione di sicurezza: PR #21

- **Branch:** `fix/sicurezza-dati-utente` (commit `e73552c`) contro `main`
- **Data:** 22 novembre 2026
- **Tipo:** revisione indipendente, solo lettura. Nessun codice modificato.
- **Verifiche eseguite:** lettura completa di `server/` e `shared/schema.ts`, lettura del client per i flussi coinvolti, `tsc` (nessun errore), `eslint` su `server`, `shared` e `client/src/lib` (0 errori, 10 avvisi).

## Esito

**Approvata con riserve.** Non ci sono problemi bloccanti. I cinque obiettivi della PR sono raggiunti. Restano due punti da correggere, uno funzionale lato client e uno di configurazione, più alcune note minori. Si possono sistemare in questa PR o in una issue successiva, purché prima della prossima release.

## Verifica degli obiettivi

### 1. Nessun hash della password in uscita: raggiunto

Ho cercato ogni punto in cui una riga di `users` viene letta o restituita.

| Percorso | Come esce l'utente | Esito |
|---|---|---|
| `storage.getUser` (storage.ts:104) | `select(publicUserColumns)` | pulito |
| `storage.createUser` (storage.ts:119) | `returning(publicUserColumns)` | pulito |
| `storage.updateUser` (storage.ts:131) | `returning(publicUserColumns)` | pulito |
| `storage.getWorkspaceMembers` (storage.ts:158) | `{ user: publicUserColumns }` nel join | pulito |
| `storage.getMessages` (storage.ts:251) | `sender: publicUserColumns` nel join | pulito |
| `storage.getDirectMessages` (storage.ts:292) | `select(publicUserColumns)` | pulito |
| `storage.updatePresence` (storage.ts:319) | `update` senza `returning` | pulito |
| `storage.getUserWithPasswordByEmail` (storage.ts:109) | `select()` completo | usato solo dal login, poi `toPublicUser` (routes.ts:279) |
| WS `message:new` (routes.ts:509) | `sender` da `getUser` | pulito |
| WS `dm:new` (routes.ts:566) | `sender` e `receiver` da `getUser` | pulito |
| WS `presence:update`, `typing:*` | solo `userId` e `userName` | pulito |

`publicUserColumns` è una lista di colonne ammesse, non una lista di esclusioni. Se in futuro si aggiunge una colonna sensibile a `users`, non esce per sbaglio. È la scelta giusta. Anche il tipo `PublicUser` aiuta: `tsc` passa, quindi nessun componente del client legge `password`.

### 2. `JWT_SECRET` obbligatorio e HS256 fisso: raggiunto

`server/config.ts` rifiuta l'avvio senza `JWT_SECRET` o con meno di 32 caratteri. `config` è il primo import di `server/index.ts` e anche `db.ts` e `routes.ts` lo importano, quindi la validazione avviene prima di qualsiasi uso. Il vecchio fallback `"slack-clone-secret-key"` è sparito. `jwt.verify` usa `algorithms: ["HS256"]` sia in HTTP (routes.ts:31) sia in WebSocket (routes.ts:123), quindi `alg: none` e la confusione di algoritmo sono bloccati.

### 3. Log senza corpo delle risposte: raggiunto

Il middleware in `server/index.ts:38-49` registra solo metodo, percorso, stato e durata. Token, messaggi e dati utente non finiscono più nei log.

### 4. Canali privati solo per i membri: raggiunto

`getAccessibleChannel` (routes.ts:99) controlla l'appartenenza al workspace e, per i canali privati, al canale. Lo usano lettura messaggi (routes.ts:472), invio messaggi (routes.ts:491) e `typing:start`/`typing:stop` (routes.ts:166). `broadcastToChannel` (routes.ts:82) manda gli eventi di un canale privato solo ai membri del canale. Ogni broadcast rilegge i membri dal database, quindi non usa elenchi in cache che potrebbero essere vecchi. L'elenco dei canali (`getChannelsVisibleToUser`, storage.ts:197) mostra solo i pubblici e i privati di cui l'utente è membro.

Ho cercato altri percorsi da cui un non membro possa leggere un canale privato: non ce ne sono. Non esiste una route per leggere un singolo canale. L'elenco membri del workspace non contiene canali. La risposta 404 è identica per canale inesistente e canale privato non accessibile, quindi non rivela che il canale esiste.

### 5. Login a tempo costante: raggiunto

`compare` viene eseguito anche quando l'email non esiste, contro `DUMMY_HASH` (routes.ts:15, 268). Il costo è 10, lo stesso usato in registrazione (routes.ts:238), quindi i tempi coincidono.

## Problemi

### Bloccanti

Nessuno.

### Da correggere

#### D1. Dopo il rilascio tutti gli utenti già collegati restano bloccati con un token non valido

- **Dove:** `server/routes.ts:39` (risponde 403), `client/src/lib/queryClient.ts:64` (gestisce solo 401), `client/src/lib/auth.tsx:19-28` (si fida di `localStorage`), `client/src/lib/socket.tsx:37` (nessuna reazione alla chiusura 1008).
- **Scenario:** la PR cambia il segreto, da `SESSION_SECRET` o dal valore fisso a `JWT_SECRET`. Al primo deploy ogni token salvato nei browser diventa invalido. Il client legge token e utente da `localStorage` e mostra l'app come se l'utente fosse collegato. Tutte le chiamate API ricevono 403 "Invalid or expired token". Il client non distingue questo errore dagli altri e non fa logout. Il WebSocket viene chiuso con codice 1008 e non succede nulla. L'utente vede errori o liste vuote finché non trova il pulsante di uscita. Il difetto c'era già per i token scaduti dopo 7 giorni, ma questa PR lo fa scattare per tutti nello stesso momento.
- **Correzione proposta:**
    - lato server, rispondere `401` anche per token non valido o scaduto in `authenticateToken`. `403` va riservato a "autenticato ma senza permesso";
    - lato client, in `throwIfResNotOk` o in un wrapper comune, su `401` cancellare `token` e `user` da `localStorage` e tornare alla pagina di accesso;
    - in `socket.tsx`, su `onclose` con `event.code === 1008`, chiamare la stessa funzione di logout.

```ts
// server/routes.ts, authenticateToken
} catch {
    return res.status(401).json({ message: "Invalid or expired token" });
}
```

#### D2. Il segreto d'esempio del README passa la validazione

- **Dove:** `README.md:288` (`JWT_SECRET=your_very_secure_secret_key_here_min_32_chars`), `server/config.ts:8-10`.
- **Scenario:** il valore d'esempio ha 45 caratteri, quindi supera il controllo `min(32)`. Chi copia il blocco del README in `.env`, o in un ambiente di produzione, avvia il server con un segreto pubblico. Chiunque legga il repository può firmare un JWT con `{ id: "<uuid della vittima>" }` e accedere come quell'utente, via HTTP e via WebSocket. Il rischio è lo stesso che la PR voleva togliere con il fallback fisso, spostato nella documentazione.
- **Correzione proposta:** due interventi, entrambi piccoli.
    - Nel README, lasciare `JWT_SECRET=` vuoto con il comando `openssl rand -hex 32`, come già fa `.env.example`.
    - In `config.ts`, rifiutare i segnaposto noti e i segreti con pochi caratteri diversi:

```ts
JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve avere almeno 32 caratteri (es. `openssl rand -hex 32`)")
    .refine((s) => !/your_|secret_key|change_?me|example/i.test(s), "JWT_SECRET è un valore d'esempio")
    .refine((s) => new Set(s).size >= 10, "JWT_SECRET ha troppo pochi caratteri diversi"),
```

### Minori

#### M1. I canali privati restano con il solo creatore

- **Dove:** `server/routes.ts:453` è l'unica chiamata a `addChannelMember`, oltre al canale `general` (routes.ts:344).
- **Scenario:** non esiste una route per aggiungere membri a un canale. Con questa PR un canale privato è visibile e utilizzabile solo da chi l'ha creato. I canali privati creati prima della PR, che su `main` erano visibili a tutto il workspace, spariscono per tutti tranne il creatore. Dal punto di vista della sicurezza è il comportamento giusto. Dal punto di vista del prodotto, la funzione "Make private" (chat-sidebar.tsx:269) oggi non serve a niente.
- **Correzione proposta:** aprire una issue per `POST /api/channels/:id/members`, accessibile solo ai membri del canale e solo verso membri dello stesso workspace. Va collegata a #12 (inviti). Conviene segnalarlo nel CHANGELOG di questa release.

#### M2. Il login a tempo costante non chiude l'enumerazione delle email

- **Dove:** `server/routes.ts:234-236`.
- **Scenario:** la registrazione risponde "Email already registered" in modo esplicito, quindi chiunque può sapere se un'email è registrata senza misurare tempi. Il problema esisteva già e la PR non lo peggiora. Lo segnalo perché il beneficio dell'obiettivo 5 oggi è parziale.
- **Correzione proposta:** da trattare con #13 (rate limit sulle route di autenticazione). Una soluzione completa richiede la verifica via email, che è fuori scopo.

#### M3. `jwt.sign` non fissa l'algoritmo e il costo bcrypt è duplicato

- **Dove:** `server/routes.ts:245-249` e `273-277` per `jwt.sign`; `routes.ts:15` e `238` per il costo 10.
- **Scenario:** oggi `jsonwebtoken` firma in HS256 per default, quindi firma e verifica coincidono. Se cambia il default della libreria o qualcuno passa a una chiave asimmetrica, i token emessi smetterebbero di passare la verifica. Allo stesso modo, se qualcuno alza il costo in registrazione e dimentica `DUMMY_HASH`, il login torna a rivelare le email dai tempi.
- **Correzione proposta:** una costante `JWT_SIGN_OPTIONS = { algorithm: "HS256", expiresIn: "7d" }` usata in entrambe le firme, e una costante `BCRYPT_ROUNDS = 10` usata sia per `hash` sia per `hashSync`.

#### M4. Le email degli utenti finiscono nei log degli errori del database

- **Dove:** `server/routes.ts:256` (`console.error("Registration error:", error)`) e gli altri `console.error` delle route.
- **Scenario:** se due registrazioni con la stessa email arrivano insieme, entrambe superano `emailExists` e la seconda fallisce sul vincolo `unique`. L'errore di `pg` contiene `detail: "Key (email)=(mario@esempio.it) already exists."` e viene stampato per intero. Non c'è l'hash della password: con drizzle-orm 0.39 l'errore non include i parametri della query. Resta comunque un dato personale nei log, in contrasto con lo spirito dell'obiettivo 3.
- **Correzione proposta:** registrare solo `error.code` e `error.message` per gli errori del database. In registrazione, intercettare il codice `23505` e rispondere 400 "Email already registered".

#### M5. Direttiva `eslint-disable` inutile

- **Dove:** `server/storage.ts:46`.
- **Scenario:** ESLint segnala "Unused eslint-disable directive". È solo rumore, ma in futuro potrebbe nascondere un avviso reale sulla stessa riga.
- **Correzione proposta:** togliere la riga, oppure scrivere `const { password: _password, ...rest } = user;` se la regola va riattivata con `argsIgnorePattern`/`varsIgnorePattern: "^_"`.

## Fuori scopo, non peggiorati dalla PR

Li ho controllati solo per capire se la PR li peggiora. Non li peggiora.

- DM verso utenti che non condividono un workspace, `dm:typing:*` verso qualsiasi `receiverId` (routes.ts:178-191, 529-577).
- Token WebSocket in query string (socket.tsx:30), assenza di rate limit e `helmet`, validazione debole di `isPrivate`, `name` e `avatar` (#13).
- Error handler che rilancia l'errore (index.ts:59, #10).
- Mancanza di inviti nei workspace (#12) e ordine dei messaggi (#11).

## Aspetti positivi

- Lista di colonne ammesse (`publicUserColumns`) al posto della destrutturazione caso per caso: il default sicuro è "non esce".
- Un solo metodo restituisce l'hash, con nome esplicito (`getUserWithPasswordByEmail`) e commento nell'interfaccia.
- Configurazione validata all'avvio con zod e messaggi chiari. Il server si ferma invece di partire con un segreto debole.
- Controllo d'accesso ai canali in una sola funzione riusata da HTTP e WebSocket. Il 404 uniforme non rivela l'esistenza dei canali privati.
- `.env.example` documentato, con il comando per generare il segreto.
- Codice più corto e più leggibile: le due copie quasi identiche della gestione `typing:*` sono diventate una.

## Raccomandazioni

- Aggiungere test di integrazione per i casi coperti dalla PR. Esempi: nessuna risposta o evento contiene la chiave `password`; un membro del workspace non membro del canale privato riceve 404 su GET e POST dei messaggi e non riceve `message:new` né `typing:start`; il server non si avvia senza `JWT_SECRET`. Oggi il repository non ha test, quindi queste garanzie possono regredire senza che la CI se ne accorga.
- Annotare nel CHANGELOG che il rilascio invalida tutte le sessioni e richiede la nuova variabile `JWT_SECRET`.
