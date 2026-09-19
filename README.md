# Strumento interno — domande alle wiki aziendali

Prima versione minima (scheletro): un utente fa login, scrive una domanda, e riceve
una risposta costruita leggendo le wiki aziendali ("cervelli") a cui il suo ruolo dà
accesso, con indicate le pagine usate.

## Indice

1. [Come far partire il progetto in locale](#1-come-far-partire-il-progetto-in-locale)
2. [Variabili d'ambiente](#2-variabili-dambiente)
3. [Come creo un utente e gli assegno i permessi](#3-come-creo-un-utente-e-gli-assegno-i-permessi)
4. [Come registro un nuovo cervello](#4-come-registro-un-nuovo-cervello)
5. [Come funziona il giro completo di una domanda](#5-come-funziona-il-giro-completo-di-una-domanda-spiegazione-semplice)
6. [Note e limiti di questa prima versione](#6-note-e-limiti-di-questa-prima-versione)

---

## 1. Come far partire il progetto in locale

Serve Node.js installato (versione 20 o superiore) e un account su
[Vercel](https://vercel.com) (per il deploy) — per lo sviluppo in locale basta Node.

1. Installa le dipendenze:
   ```
   npm install
   ```
2. Copia il file di esempio delle variabili d'ambiente:
   ```
   cp .env.example .env.local
   ```
3. Apri `.env.local` e riempi ogni riga con i valori veri (vedi sezione 2 qui sotto
   per capire dove trovarli). Questo file resta solo sul tuo computer, non va mai
   caricato su Git (è già escluso, vedi `.gitignore`).
4. Assicurati di aver già creato le tabelle nel database Supabase — in questa prima
   versione le ho create direttamente io con lo strumento che avevo collegato, quindi
   se stai leggendo questo file sul progetto consegnato dovrebbero già esistere.
5. Avvia il server di sviluppo:
   ```
   npm run dev
   ```
6. Apri `http://localhost:3000` nel browser: vedrai la pagina di login. Per entrare
   serve un utente già creato su Supabase (vedi sezione 3).

Per il deploy su Vercel: collega la repository GitHub del progetto a un nuovo
progetto Vercel, imposta le stesse variabili d'ambiente (sezione 2) nelle
impostazioni del progetto Vercel, poi Vercel farà build e deploy automaticamente ad
ogni push.

## 2. Variabili d'ambiente

| Nome | A cosa serve | Dove trovi il valore |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Indirizzo del progetto Supabase | Supabase → Project Settings → API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave pubblica, usata dal browser per il login | Supabase → Project Settings → API → "anon public" |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave segreta, usata **solo dal server** per leggere permessi e cervelli | Supabase → Project Settings → API → "service_role secret" |
| `GITHUB_TOKEN` | Token per leggere le repository delle wiki | Da creare su GitHub (vedi sotto) |
| `ANTHROPIC_API_KEY` | Chiave per chiamare il modello Claude | console.anthropic.com |

Il `GITHUB_TOKEN` deve essere un Personal Access Token con permesso di lettura sul
contenuto delle repository che userai come cervelli (basta l'accesso in lettura, non
serve scrittura). Vede tutte le repository a cui ha accesso: è il codice
dell'applicazione, non il token, a decidere cosa un utente può davvero leggere.

**Dove le metti:**
- **In locale**: nel file `.env.local` nella radice del progetto (non su Git).
- **Su Vercel**: Project Settings → Environment Variables, stesso nome e stesso
  valore di ognuna, per l'ambiente "Production" (e "Preview" se lo usi). I valori
  non li scrivo io da nessuna parte nel codice: li inserisci tu direttamente lì.

## 3. Come creo un utente e gli assegno i permessi

Non c'è nessuna pagina di registrazione nell'app: gli utenti si creano solo dal
pannello di Supabase, in due passaggi.

**Passo 1 — crea l'account di accesso (email + password)**

1. Vai su Supabase → Authentication → Users → "Add user".
2. Inserisci un'email e una password (minimo 6 caratteri). Per una prova puoi usare
   valori del tutto fittizi, es. email `admin@admin.com` e password `admin123` — non
   deve essere per forza l'email vera di una persona.
3. Salva. Supabase crea l'utente e gli assegna un identificativo lungo (UUID):
   cliccando sull'utente nella lista lo vedi in cima alla pagina, è il valore "UID".
   Copialo, ti serve subito dopo.

**Passo 2 — crea la sua scheda nella tabella "utenti"**

1. Vai su Supabase → Table Editor → tabella `utenti` → "Insert row".
2. Compila:
   - `id`: incolla l'UID copiato al passo 1 (deve essere identico).
   - `email`: la stessa email del passo 1.
   - `nome`: facoltativo, es. "Mario Rossi".
   - `attivo`: lascialo su `true`.
3. Salva.

**Passo 3 — dagli i permessi**

1. Vai su Table Editor → tabella `permessi`: qui vedi l'elenco dei permessi
   esistenti (es. `wiki_vendite.leggi`) con il loro `id` numerico.
2. Vai su Table Editor → tabella `utenti_permessi` → "Insert row".
3. Compila:
   - `utente_id`: l'UID dell'utente (lo stesso di prima).
   - `permesso_id`: l'`id` numerico del permesso che vuoi dargli (preso dalla
     tabella `permessi`).
   - `scade_il`: lascialo vuoto se il permesso non deve mai scadere, altrimenti
     metti una data.
4. Ripeti per ogni permesso che vuoi assegnare a quell'utente.

Per **disattivare** una persona senza cancellarla: tabella `utenti`, riga sua,
metti `attivo` a `false`. Da quel momento non potrà più usare lo strumento, anche
se la password continua a funzionare. Per rimuoverla del tutto, cancellala prima
da Authentication → Users: se ha già fatto delle domande (righe nella tabella
`log`), il database rifiuterà la cancellazione per non perdere lo storico — in quel
caso disattivala invece di cancellarla.

> Nota: in questa prima versione questi tre passaggi sono manuali. Si potrebbe
> automatizzare il passo 2 (creare in automatico la riga in `utenti` quando crei
> l'utente in Authentication), ma per ora non l'ho fatto per non aggiungere
> meccanismi non richiesti.

## 4. Come registro un nuovo cervello

Un cervello è una repository GitHub con file markdown collegati tra loro. Per
registrarne uno nuovo:

1. Assicurati che il `GITHUB_TOKEN` configurato abbia accesso in lettura a quella
   repository.
2. Se non esiste già, crea il permesso corrispondente: Table Editor → `permessi` →
   "Insert row" → scegli un `codice` (es. `wiki_marketing.leggi`) e una
   `descrizione`.
3. Vai su Table Editor → tabella `cervelli` → "Insert row" e compila:
   - `nome`: il nome mostrato, es. "Wiki Marketing".
   - `slug`: un nome breve univoco, es. `marketing` (userà questo per riferirsi al
     cervello internamente).
   - `repo_owner`: il proprietario della repository su GitHub (utente o
     organizzazione).
   - `repo_name`: il nome della repository.
   - `branch`: il ramo da leggere, es. `main`.
   - `permesso_richiesto`: il `codice` del permesso creato al punto 2 (es.
     `wiki_marketing.leggi`), non il suo numero.
   - `attivo`: `true` per renderlo subito consultabile.
4. Assegna quel permesso agli utenti che devono poter consultare questo cervello
   (sezione 3, passo 3).

Perché il cervello compaia agli utenti serve anche che quella repository abbia,
nella sua radice, un file `INDEX.md` o `README.md`: è quello che il sistema mostra
come punto di partenza per orientarsi tra le pagine.

## 5. Come funziona il giro completo di una domanda (spiegazione semplice)

1. La persona fa login con email e password: chi verifica che siano corrette è
   Supabase, la nostra applicazione non vede né conserva mai la password.
2. La persona scrive una domanda e preme "Invia".
3. Il server controlla chi ha fatto la domanda e guarda, nel database, quali
   permessi ha quella persona e quindi quali wiki aziendali ("cervelli") può
   consultare. Le wiki per cui non ha il permesso vengono ignorate completamente:
   è come se non esistessero.
4. Il server prepara una mappa con solo gli indici delle wiki permesse e la
   consegna al modello Claude, insieme alla domanda.
5. Claude legge la mappa e decide da solo quali pagine aprire per rispondere,
   proprio come farebbe una persona: apre una pagina, ci trova dei collegamenti ad
   altre pagine, e li segue se pensa che siano utili — anche passando da una wiki
   all'altra, se entrambe sono permesse. Ogni volta che Claude chiede di aprire una
   pagina, il server ricontrolla che quella wiki sia davvero tra quelle permesse a
   questa persona, prima di consegnargliela: è l'unico punto in cui questo
   controllo viene fatto, ed è sempre attivo. Per evitare che il giro duri
   all'infinito, dopo 8 pagine aperte il sistema obbliga Claude a rispondere con
   quello che ha trovato fino a quel momento.
6. Claude scrive la risposta finale, citando le pagine che ha usato, e dice
   chiaramente se non ha trovato l'informazione richiesta, invece di inventarla.
7. La persona vede la risposta e, sotto, l'elenco delle pagine effettivamente
   consultate.
8. Il server salva una riga di log con la domanda, la risposta, le pagine lette, e
   una stima di quanto è costata quella richiesta.

## 6. Note e limiti di questa prima versione

Cose che ho deciso io in fase di costruzione e che è bene tu sappia:

- **Permessi applicati in un solo punto**: tutta la logica di "chi può leggere
  cosa" vive esclusivamente in `src/app/api/chiedi/route.ts` (cercalo, è
  commentato in modo evidente). Il database ha la sicurezza a livello di riga
  (RLS) attiva su tutte le tabelle ma senza regole che aprano l'accesso dal
  browser: solo il server, con la chiave `SUPABASE_SERVICE_ROLE_KEY`, può
  leggerle.
- **Costo stimato, non esatto**: la colonna `costo` nel log è calcolata
  moltiplicando i token usati per un prezzo scritto nel codice
  (`src/app/api/chiedi/route.ts`, costante `PREZZO_PER_MILIONE_TOKEN`). Se
  Anthropic cambia i prezzi del modello, va aggiornata quella costante — è un
  numero indicativo, non una fattura.
- **Niente pagina di logout dedicata**: ho aggiunto un semplice link "Esci" nella
  pagina della domanda, per poter testare con utenti diversi, anche se non era
  esplicitamente richiesto.
- **Niente rinnovo automatico della sessione in background** (il cosiddetto
  `middleware.ts` di Next.js): per restare minimi, la sessione viene controllata
  direttamente in ogni pagina. Effetto pratico: se una persona resta con la pagina
  aperta senza fare nulla per molto tempo, potrebbe doversi rifare il login prima
  del normale. Facile da aggiungere in seguito se diventa un problema.
- **Cache in memoria**: le pagine GitHub lette restano in cache per 10 minuti,
  come richiesto. Su Vercel questa cache vive dentro una singola istanza del
  server: aiuta molto durante la stessa richiesta (quando Claude rilegge una
  pagina già aperta) ma non è garantita da una richiesta all'altra.

Tabelle, colonne e la struttura dei file sono descritte per esteso nella
conversazione in cui abbiamo progettato questo strumento; le migration SQL sono in
`supabase/migrations/`.
