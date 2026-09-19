-- Tabella "utenti": la scheda di ogni persona che può usare lo strumento.
-- Non contiene MAI la password: l'accesso (email + password) è gestito da Supabase Auth,
-- questa tabella si collega solo all'identità che Auth ha già creato.
create table public.utenti (
  -- Stesso identificativo che Supabase Auth assegna alla persona quando viene creata.
  -- Non lo inventiamo noi: lo prendiamo da auth.users. Se l'utente viene cancellato da
  -- Auth, questa riga sparisce insieme a lui (on delete cascade).
  id uuid primary key references auth.users (id) on delete cascade,

  -- Email della persona (deve essere la stessa usata per il login).
  email text not null unique,

  -- Nome da mostrare, facoltativo.
  nome text,

  -- Se è false, la persona non può più usare lo strumento anche se la password funziona
  -- ancora. Serve per "disattivare" qualcuno senza cancellare la sua identità Auth.
  attivo boolean not null default true,

  -- Data e ora di creazione della scheda, riempita da sola dal database.
  creato_il timestamptz not null default now()
);

-- Nessuna app client (browser) deve poter leggere/scrivere questa tabella direttamente:
-- solo il server, con la service role key, ci accede. Vedi README per i dettagli.
alter table public.utenti enable row level security;
