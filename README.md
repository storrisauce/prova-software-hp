# Strumento interno — domande alle wiki aziendali

Prima versione minima (scheletro): un utente scrive una domanda e riceve una
risposta costruita leggendo le wiki aziendali ("cervelli"), con indicate le pagine
usate.

> **Il login è disattivato per ora, su richiesta esplicita, per questa fase di
> prova**: chiunque abbia l'indirizzo del sito può fare domande, senza il filtro
> per permessi. Il codice e le tabelle del login/permessi ci sono ancora, solo
> spenti — vedi la sezione 6 per come e dove riaccenderli quando serve.

## Indice

1. [Come far partire il progetto in locale](#1-come-far-partire-il-progetto-in-locale)
2. [Variabili d'ambiente](#2-variabili-dambiente)
3. [Come creo un utente e gli assegno i permessi](#3-come-creo-un-utente-e-gli-assegno-i-permessi)
4. [Come registro un nuovo cervello](#4-come-registro-un-nuovo-cervello)
5. [Come funziona il giro completo di una domanda](#5-come-funziona-il-giro-completo-di-una-domanda-spiegazione-semplice)
6. [Note e limiti di questa prima versione](#6-note-e-limiti-di-questa-prima-versione)
7. [Come si aggiornano il sito e il database dopo una modifica](#7-come-si-aggiornano-il-sito-e-il-database-dopo-una-modifica)

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
6. Apri `http://localhost:3000` nel browser: vedrai subito il modulo per fare una
   domanda (il login è disattivato per ora, vedi la nota in cima a questo file).

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

**Claude non ha un "indirizzo" (endpoint) da configurare**: il codice si collega già
da solo all'indirizzo giusto di Anthropic. L'unica cosa che ti serve è la chiave
`ANTHROPIC_API_KEY`.

### Come ottieni la chiave Anthropic

1. Vai su [console.anthropic.com](https://console.anthropic.com) e accedi (o crea
   l'account dell'azienda, se non esiste ancora).
2. Vai nella sezione "API Keys" → "Create Key".
3. Copia la chiave (inizia con `sk-ant-...`): viene mostrata una sola volta, salvala
   subito da qualche parte al sicuro.

### Come ottieni il token GitHub

1. Su GitHub: foto profilo in alto a destra → **Settings**.
2. In fondo al menu a sinistra: **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. In "Repository access" scegli **Only select repositories** e seleziona solo le
   repository delle wiki (i cervelli) — non serve dare accesso a tutta la tua
   organizzazione.
5. In "Permissions" → "Repository permissions" → **Contents** imposta **Read-only**
   (è l'unico permesso necessario).
6. Genera e copia il token (inizia con `github_pat_...`).

### Dove inserisci tutti questi valori

- **In locale**: apri il file `.env.local` (creato al punto 1 copiando
  `.env.example`) e incolla ogni valore dopo il segno `=`, ad esempio
  `ANTHROPIC_API_KEY=sk-ant-...`. Se lo modifichi mentre `npm run dev` è già
  acceso, riavvialo perché legga il nuovo valore.
- **Su Vercel**: apri il progetto su vercel.com → scheda **Settings** in alto →
  **Environment Variables** nel menu a sinistra → **Add New** → nel campo "Key"
  scrivi il nome esatto della variabile (es. `ANTHROPIC_API_KEY`), nel campo
  "Value" incolla il valore, spunta almeno "Production" → **Save**. Ripeti per
  ognuna delle 5 variabili. I valori non li scrivo mai io nel codice: li inserisci
  solo tu, qui.
- **Importante**: dopo aver aggiunto o modificato una variabile su Vercel, i deploy
  già fatti in passato NON la vedono automaticamente. Serve un nuovo deploy: dalla
  scheda "Deployments", sui tre puntini dell'ultimo deploy → **Redeploy** (oppure
  basta un nuovo push su GitHub, che ne avvia uno nuovo).

## 3. Come creo un utente e gli assegno i permessi

> Con il login disattivato (vedi nota in cima), questi passaggi non hanno ancora
> effetto sull'app: chiunque può fare domande senza bisogno di un utente. Restano
> comunque validi per quando il login verrà riattivato, e puoi già prepararli.

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

Questa è la spiegazione del funzionamento "a regime", con il login attivo. Nella
versione attuale il passo 1 non c'è (nessun login) e al passo 3 il server prende
in considerazione tutte le wiki attive invece di filtrarle per permessi — il resto
funziona esattamente come descritto.

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
   pagina, il server ricontrolla che quella wiki sia valida e attiva prima di
   consegnargliela: è l'unico punto in cui questo controllo viene fatto, ed è
   sempre attivo. Per evitare che il giro duri all'infinito, dopo 8 pagine aperte
   il sistema obbliga Claude a rispondere con quello che ha trovato fino a quel
   momento.
6. Claude scrive la risposta finale, citando le pagine che ha usato, e dice
   chiaramente se non ha trovato l'informazione richiesta, invece di inventarla.
7. La persona vede la risposta e, sotto, l'elenco delle pagine effettivamente
   consultate.
8. Il server salva una riga di log con la domanda, la risposta, le pagine lette, e
   una stima di quanto è costata quella richiesta.

## 6. Note e limiti di questa prima versione

Cose che ho deciso io in fase di costruzione e che è bene tu sappia:

- **Login disattivato per ora, su tua richiesta**: `src/app/api/chiedi/route.ts`
  non controlla più la sessione né filtra i cervelli per permessi (vedi il blocco
  commentato "LOGIN DISATTIVATO PER ORA" al suo interno) — vengono usati tutti i
  cervelli con `attivo = true`. `src/app/page.tsx` e `src/app/chiedi/page.tsx` non
  reindirizzano più al login. Non ho cancellato nulla: `src/app/login-form.tsx`,
  `src/lib/supabase/client.ts` e `src/lib/supabase/server.ts` sono rimasti
  invariati e pronti per essere ricollegati, e le tabelle `utenti`, `permessi`,
  `utenti_permessi` restano nel database. Per riaccenderlo bisogna ripristinare il
  controllo sessione e il filtro per permessi in quei tre file (la versione
  precedente è nella cronologia git).
- **Permessi applicati in un solo punto**: quando il login sarà di nuovo attivo,
  tutta la logica di "chi può leggere cosa" tornerà a vivere esclusivamente in
  `src/app/api/chiedi/route.ts`. Il database ha comunque la sicurezza a livello di
  riga (RLS) attiva su tutte le tabelle, senza regole che aprano l'accesso dal
  browser: solo il server, con la chiave `SUPABASE_SERVICE_ROLE_KEY`, può
  leggerle.
- **Costo stimato, non esatto**: la colonna `costo` nel log è calcolata
  moltiplicando i token usati per un prezzo scritto nel codice
  (`src/app/api/chiedi/route.ts`, costante `PREZZO_PER_MILIONE_TOKEN`). Se
  Anthropic cambia i prezzi del modello, va aggiornata quella costante — è un
  numero indicativo, non una fattura.
- **`log.utente_id` ora può restare vuoto**: senza login non c'è più un utente da
  registrare per ogni domanda, quindi ho tolto il vincolo "obbligatorio" da questa
  colonna (migration `0006_log_utente_id_nullable.sql`). Quando il login torna, si
  può ripristinare l'obbligo.
- **Niente rinnovo automatico della sessione in background** (il cosiddetto
  `middleware.ts` di Next.js): per restare minimi, la sessione veniva controllata
  direttamente in ogni pagina (tornerà rilevante quando il login sarà riattivo).
- **Cache in memoria**: le pagine GitHub lette restano in cache per 10 minuti,
  come richiesto. Su Vercel questa cache vive dentro una singola istanza del
  server: aiuta molto durante la stessa richiesta (quando Claude rilegge una
  pagina già aperta) ma non è garantita da una richiesta all'altra.
- **Aspetto grafico**: ho aggiunto uno stile semplice (`src/app/globals.css`) —
  niente framework grafico installato, solo CSS scritto a mano.

Tabelle, colonne e la struttura dei file sono descritte per esteso nella
conversazione in cui abbiamo progettato questo strumento; le migration SQL sono in
`supabase/migrations/`.

## 7. Come si aggiornano il sito e il database dopo una modifica

**Codice**: quando faccio una modifica, la applico direttamente alla repository
GitHub del progetto (commit + push). Non tocco file solo "in locale": tutto quello
che vedi qui arriva già pubblicato su GitHub.

**Vercel non si aggiorna sempre da solo sul sito principale.** Quando importi un
progetto GitHub su Vercel, di norma succede questo:
- Vercel guarda un branch "di produzione" (di solito `main`) per il sito
  definitivo, quello con l'indirizzo principale.
- Ogni push su un **altro** branch (compreso quello che sto usando io per questo
  progetto) genera invece, in automatico, un **Preview Deployment**: un indirizzo
  temporaneo e separato, che trovi nella scheda **Deployments** del progetto su
  Vercel, cercando il nome del branch.

Quindi le mie modifiche arrivano già online su un indirizzo di anteprima ad ogni
push, ma **non aggiornano da sole il sito principale** finché quel branch non
diventa (o non viene unito a) il branch di produzione. Per farle diventare
definitive hai due strade:

1. **Unire il branch a `main`** con una Pull Request su GitHub (posso aprirla io,
   se me lo chiedi esplicitamente — poi va confermata/unita da un umano, a meno
   che tu non mi dica di farlo anche io).
2. **Cambiare il branch di produzione su Vercel**: Project Settings → Git →
   "Production Branch", e mettere il branch che sto usando al posto di `main`.
   Più comodo in questa fase di prova, se vuoi vedere ogni modifica online subito
   senza passare da una Pull Request.

In ogni caso, dopo ogni mio push, controlla la scheda **Deployments** su Vercel: se
una build fallisce (es. per una variabile d'ambiente mancante), lo vedi lì.
