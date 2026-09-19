// Unico modulo che sa come leggere il contenuto dei "cervelli" (le wiki su GitHub).
// Se in futuro cambiasse la sorgente dei contenuti, si tocca solo questo file: il
// resto dell'applicazione non sa nulla di GitHub.
//
// Questo modulo NON controlla i permessi: si fida di chi lo chiama. Il controllo dei
// permessi vive in un unico altro posto, vedi src/app/api/chiedi/route.ts.

const GITHUB_API = 'https://api.github.com'
const TTL_CACHE_MS = 10 * 60 * 1000 // 10 minuti

export type Cervello = {
  slug: string
  repo_owner: string
  repo_name: string
  branch: string
}

type VoceCache<T> = { valore: T; scadeIl: number }

const cache = new Map<string, VoceCache<unknown>>()

function leggiDallaCache<T>(chiave: string): T | undefined {
  const voce = cache.get(chiave)
  if (!voce) return undefined
  if (Date.now() > voce.scadeIl) {
    cache.delete(chiave)
    return undefined
  }
  return voce.valore as T
}

function scriviInCache<T>(chiave: string, valore: T) {
  cache.set(chiave, { valore, scadeIl: Date.now() + TTL_CACHE_MS })
}

function headerGitHub() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN non configurato')
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function codificaPercorso(percorso: string): string {
  return percorso.split('/').map(encodeURIComponent).join('/')
}

// Elenco di tutti i file .md della repository del cervello.
export async function listaPagine(cervello: Cervello): Promise<string[]> {
  const chiave = `lista:${cervello.repo_owner}/${cervello.repo_name}@${cervello.branch}`
  const dallaCache = leggiDallaCache<string[]>(chiave)
  if (dallaCache) return dallaCache

  const risposta = await fetch(
    `${GITHUB_API}/repos/${cervello.repo_owner}/${cervello.repo_name}/git/trees/${cervello.branch}?recursive=1`,
    { headers: headerGitHub() }
  )
  if (!risposta.ok) {
    throw new Error(
      `Errore GitHub (${risposta.status}) leggendo l'elenco delle pagine di "${cervello.slug}".`
    )
  }
  const dati = (await risposta.json()) as { tree: Array<{ path: string; type: string }> }

  const pagine = dati.tree
    .filter((voce) => voce.type === 'blob' && voce.path.endsWith('.md'))
    .map((voce) => voce.path)

  scriviInCache(chiave, pagine)
  return pagine
}

// Contenuto integrale di un file della repository (decodifica il base64 di GitHub).
// Restituisce null se il file non esiste.
async function leggiFileGrezzo(cervello: Cervello, percorso: string): Promise<string | null> {
  const chiave = `file:${cervello.repo_owner}/${cervello.repo_name}@${cervello.branch}:${percorso}`
  const dallaCache = leggiDallaCache<string | null>(chiave)
  if (dallaCache !== undefined) return dallaCache

  const risposta = await fetch(
    `${GITHUB_API}/repos/${cervello.repo_owner}/${cervello.repo_name}/contents/${codificaPercorso(
      percorso
    )}?ref=${cervello.branch}`,
    { headers: headerGitHub() }
  )

  if (risposta.status === 404) {
    scriviInCache(chiave, null)
    return null
  }
  if (!risposta.ok) {
    throw new Error(`Errore GitHub (${risposta.status}) leggendo "${percorso}" da "${cervello.slug}".`)
  }

  const dati = (await risposta.json()) as { content: string }
  const contenuto = Buffer.from(dati.content, 'base64').toString('utf-8')
  scriviInCache(chiave, contenuto)
  return contenuto
}

// Se esiste INDEX.md o README.md nella radice del cervello lo restituisce.
// Altrimenti genera un semplice elenco puntato dai percorsi dei file.
export async function leggiIndice(cervello: Cervello): Promise<string> {
  const indice = await leggiFileGrezzo(cervello, 'INDEX.md')
  if (indice !== null) return indice

  const readme = await leggiFileGrezzo(cervello, 'README.md')
  if (readme !== null) return readme

  const pagine = await listaPagine(cervello)
  return pagine.map((percorso) => `- ${percorso}`).join('\n')
}

// Contenuto integrale di una pagina del cervello. Restituisce null se non esiste.
export async function leggiPagina(cervello: Cervello, percorso: string): Promise<string | null> {
  return leggiFileGrezzo(cervello, percorso)
}
