-- Tabella "utenti_permessi": l'elenco "chi ha quale permesso".
-- Ogni riga collega UN utente a UN permesso.
create table public.utenti_permessi (
  -- Quale utente.
  utente_id uuid not null references public.utenti (id) on delete cascade,

  -- Quale permesso.
  permesso_id bigint not null references public.permessi (id) on delete cascade,

  -- Data oltre la quale il permesso non vale più. Se è vuoto (NULL), non scade mai.
  scade_il timestamptz,

  -- Non può esistere due volte la stessa coppia utente+permesso.
  primary key (utente_id, permesso_id)
);

alter table public.utenti_permessi enable row level security;
