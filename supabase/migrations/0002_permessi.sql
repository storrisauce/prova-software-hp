-- Tabella "permessi": l'elenco di tutti i permessi che possono esistere nel sistema.
-- Un permesso è come un'etichetta, es. "wiki_vendite.leggi".
create table public.permessi (
  -- Numero progressivo assegnato automaticamente (1, 2, 3, ...).
  id bigint generated always as identity primary key,

  -- Il nome del permesso, quello leggibile, usato ovunque nel codice. Deve essere unico.
  codice text not null unique,

  -- Testo libero per ricordarsi a cosa serve questo permesso.
  descrizione text
);

alter table public.permessi enable row level security;
