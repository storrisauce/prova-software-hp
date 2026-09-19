-- Dati di prova: 2 permessi e 2 cervelli di esempio.
-- Sono valori segnaposto: modificali con i dati veri delle vostre wiki
-- (vedi il README, sezione "Come registro un nuovo cervello").

insert into public.permessi (codice, descrizione) values
  ('wiki_vendite.leggi', 'Può consultare la wiki del reparto Vendite'),
  ('wiki_prodotto.leggi', 'Può consultare la wiki del reparto Prodotto');

insert into public.cervelli (nome, slug, repo_owner, repo_name, branch, permesso_richiesto) values
  ('Wiki Vendite', 'vendite', 'NOME-ORGANIZZAZIONE', 'wiki-vendite', 'main', 'wiki_vendite.leggi'),
  ('Wiki Prodotto', 'prodotto', 'NOME-ORGANIZZAZIONE', 'wiki-prodotto', 'main', 'wiki_prodotto.leggi');
