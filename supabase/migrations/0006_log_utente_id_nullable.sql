-- Con il login disattivato temporaneamente (vedi src/app/api/chiedi/route.ts),
-- le domande possono arrivare senza un utente collegato: la colonna deve poter
-- restare vuota. Quando il login torna attivo, si può ripristinare "not null".
alter table public.log alter column utente_id drop not null;
