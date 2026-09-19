-- Tabella "log": la registrazione di ogni domanda fatta e risposta data.
create table public.log (
  id bigint generated always as identity primary key,

  -- Chi ha fatto la domanda.
  utente_id uuid not null references public.utenti (id),

  -- Il testo della domanda.
  domanda text not null,

  -- Il testo della risposta.
  risposta text not null,

  -- Elenco delle pagine effettivamente aperte per rispondere,
  -- es. [{"cervello": "vendite", "percorso": "prezzi.md"}].
  pagine_lette jsonb not null default '[]'::jsonb,

  -- Quanti "token" (unità di testo) ha usato il modello per elaborare la richiesta
  -- (lettura mappa + pagine + risposta finale, sommati).
  token_usati integer not null,

  -- Costo stimato in dollari di questa richiesta, calcolato automaticamente dal codice.
  costo numeric(10, 6) not null,

  -- Data e ora della richiesta.
  creato_il timestamptz not null default now()
);

alter table public.log enable row level security;
