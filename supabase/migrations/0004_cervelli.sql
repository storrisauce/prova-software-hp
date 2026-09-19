-- Tabella "cervelli": l'elenco delle wiki aziendali collegate allo strumento.
-- Ogni cervello corrisponde a UNA repository GitHub.
create table public.cervelli (
  id bigint generated always as identity primary key,

  -- Nome mostrato all'utente, es. "Wiki Vendite".
  nome text not null,

  -- Nome breve usato internamente per identificare il cervello nella mappa dato al
  -- modello, es. "vendite". Deve essere unico.
  slug text not null unique,

  -- Proprietario della repository GitHub (organizzazione o utente), es. "acme-corp".
  repo_owner text not null,

  -- Nome della repository GitHub, es. "wiki-vendite".
  repo_name text not null,

  -- Ramo (branch) della repository da leggere.
  branch text not null default 'main',

  -- Il codice del permesso necessario per poter consultare questo cervello.
  -- Fa riferimento alla colonna "codice" della tabella permessi (non al suo id numerico).
  permesso_richiesto text not null references public.permessi (codice),

  -- Se è false, il cervello è disattivato: nessuno lo vede, anche con il permesso giusto.
  attivo boolean not null default true
);

alter table public.cervelli enable row level security;
