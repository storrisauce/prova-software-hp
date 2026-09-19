import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { leggiIndice, leggiPagina, type Cervello } from '@/lib/cervelli'

export const runtime = 'nodejs'

const MODELLO = 'claude-sonnet-5'
const MAX_LETTURE = 8

// Prezzi per milione di token: verificare su https://www.anthropic.com/pricing,
// possono cambiare. Servono solo per stimare il costo salvato nel log, non incidono
// sul funzionamento dello strumento.
const PREZZO_PER_MILIONE_TOKEN = {
  input: 3,
  output: 15,
}

type CervelloRiga = Cervello & {
  id: number
  nome: string
  permesso_richiesto: string
  attivo: boolean
}

export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { domanda?: string } | null
  const domanda = corpo?.domanda

  if (!domanda || typeof domanda !== 'string' || !domanda.trim()) {
    return NextResponse.json({ errore: 'Manca la domanda.' }, { status: 400 })
  }

  // --- 1. Verifica la sessione Supabase -------------------------------------
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ errore: 'Non autenticato.' }, { status: 401 })
  }

  // Da qui in poi usiamo la service role key: è QUESTO codice, non il browser, a
  // decidere cosa l'utente può vedere. Vedi il blocco marcato più sotto.
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: utente } = await db
    .from('utenti')
    .select('attivo')
    .eq('id', user.id)
    .single()

  if (!utente || !utente.attivo) {
    return NextResponse.json({ errore: 'Utente non configurato o non attivo.' }, { status: 403 })
  }

  // --- 2. Permessi dell'utente -> cervelli consultabili -----------------------
  const { data: righePermessi } = await db
    .from('utenti_permessi')
    .select('scade_il, permessi(codice)')
    .eq('utente_id', user.id)

  const adesso = Date.now()
  const codiciPermessiValidi = (righePermessi ?? [])
    .filter((riga) => !riga.scade_il || new Date(riga.scade_il).getTime() > adesso)
    .map((riga) => (riga.permessi as unknown as { codice: string } | null)?.codice)
    .filter((codice): codice is string => Boolean(codice))

  let cervelliPermessi: CervelloRiga[] = []

  if (codiciPermessiValidi.length > 0) {
    const { data } = await db
      .from('cervelli')
      .select('*')
      .eq('attivo', true)
      .in('permesso_richiesto', codiciPermessiValidi)
    cervelliPermessi = (data as CervelloRiga[] | null) ?? []
  }

  if (cervelliPermessi.length === 0) {
    return NextResponse.json({ errore: 'Non hai accesso a nessun cervello.' }, { status: 403 })
  }

  // --- 3. Mappa unica: solo gli indici dei cervelli permessi ------------------
  // I cervelli non permessi non vengono nemmeno interrogati: non possono comparire
  // nella mappa, nemmeno come titolo.
  const sezioniMappa = await Promise.all(
    cervelliPermessi.map(async (cervello) => {
      const indice = await leggiIndice(cervello)
      return `## Cervello: ${cervello.slug} (${cervello.nome})\n\n${indice}`
    })
  )
  const mappa = sezioniMappa.join('\n\n---\n\n')

  // --- 4. Ciclo di tool use con Anthropic --------------------------------------
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const strumenti: Anthropic.Tool[] = [
    {
      name: 'leggi_pagina',
      description:
        "Apre e restituisce il contenuto integrale di una pagina markdown di uno dei cervelli disponibili. Usalo per leggere l'indice o per seguire un collegamento trovato in una pagina già letta.",
      input_schema: {
        type: 'object',
        properties: {
          cervello: {
            type: 'string',
            description: 'Lo slug del cervello a cui appartiene la pagina, es. "vendite".',
          },
          percorso: {
            type: 'string',
            description: 'Il percorso del file .md dentro il cervello, es. "prezzi/2024.md".',
          },
        },
        required: ['cervello', 'percorso'],
      },
    },
  ]

  const promptDiSistema = `Hai a disposizione una mappa delle wiki aziendali (i "cervelli") a cui questo utente ha accesso. La mappa contiene, per ciascun cervello permesso, l'indice delle sue pagine.

Per leggere il contenuto integrale di una pagina usa lo strumento leggi_pagina(cervello, percorso), indicando lo slug del cervello e il percorso esatto del file così come appare nella mappa o nei collegamenti trovati nelle pagine già lette.

Dentro le pagine troverai collegamenti verso altre pagine, scritti come [[wikilink]] oppure come normali link markdown [testo](percorso). Puoi seguirli aprendo la pagina corrispondente con lo stesso strumento, anche se appartiene a un cervello diverso da quello in cui hai trovato il collegamento, purché quel cervello compaia in questa mappa: se un cervello non è in questa mappa, per te non esiste.

Naviga tra le pagine come farebbe una persona che clicca sui collegamenti, finché non hai trovato abbastanza informazioni per rispondere o finché non hai esaurito le pagine rilevanti.

Quando rispondi:
- Cita sempre le pagine che hai usato per costruire la risposta.
- Se non trovi l'informazione richiesta nelle wiki a cui hai accesso, dillo chiaramente. Non inventare mai contenuti che non hai letto.

Mappa disponibile:

${mappa}`

  const messaggi: Anthropic.MessageParam[] = [{ role: 'user', content: domanda }]

  const pagineLette: { cervello: string; percorso: string }[] = []
  let tokenInput = 0
  let tokenOutput = 0
  let numeroLetture = 0
  let ultimaRisposta: Anthropic.Message | null = null

  while (true) {
    const permetteAncoraStrumenti = numeroLetture < MAX_LETTURE

    const risposta = await anthropic.messages.create({
      model: MODELLO,
      max_tokens: 4096,
      system: promptDiSistema,
      tools: permetteAncoraStrumenti ? strumenti : undefined,
      messages: messaggi,
    })

    ultimaRisposta = risposta
    tokenInput += risposta.usage.input_tokens
    tokenOutput += risposta.usage.output_tokens

    if (risposta.stop_reason !== 'tool_use') {
      break
    }

    messaggi.push({ role: 'assistant', content: risposta.content })

    const risultatiStrumenti: Anthropic.ToolResultBlockParam[] = []

    for (const blocco of risposta.content) {
      if (blocco.type !== 'tool_use') continue

      const input = blocco.input as { cervello?: string; percorso?: string }
      numeroLetture += 1

      // ==========================================================================
      // PUNTO 5 — UNICO POSTO IN CUI I PERMESSI VENGONO APPLICATI.
      // Il token GitHub vede tutte le repository: è questo blocco, e solo questo,
      // a decidere cosa l'utente ha diritto di vedere. Non aggirare né duplicare
      // questa logica altrove (es. non fidarsi di ciò che il modello dichiara).
      // ==========================================================================
      let testoRisultato: string
      let isError = false

      if (numeroLetture > MAX_LETTURE) {
        testoRisultato =
          'Limite massimo di pagine lette raggiunto per questa richiesta. Rispondi con le informazioni raccolte finora, segnalando se sono incomplete.'
        isError = true
      } else {
        const cervello = cervelliPermessi.find((c) => c.slug === input.cervello)

        if (!cervello) {
          testoRisultato = `Il cervello "${input.cervello}" non esiste o non sei autorizzato a consultarlo.`
          isError = true
        } else if (!input.percorso || input.percorso.includes('..') || input.percorso.startsWith('/')) {
          testoRisultato = 'Percorso non valido.'
          isError = true
        } else if (!input.percorso.endsWith('.md')) {
          testoRisultato = 'Si possono leggere solo file .md.'
          isError = true
        } else {
          const contenuto = await leggiPagina(cervello, input.percorso)
          if (contenuto === null) {
            testoRisultato = `La pagina "${input.percorso}" non esiste in questo cervello.`
            isError = true
          } else {
            pagineLette.push({ cervello: cervello.slug, percorso: input.percorso })
            testoRisultato = contenuto
          }
        }
      }
      // ==========================================================================
      // FINE PUNTO 5.
      // ==========================================================================

      risultatiStrumenti.push({
        type: 'tool_result',
        tool_use_id: blocco.id,
        content: testoRisultato,
        is_error: isError,
      })
    }

    messaggi.push({ role: 'user', content: risultatiStrumenti })
  }

  const testoFinale = ultimaRisposta!.content
    .filter((blocco): blocco is Anthropic.TextBlock => blocco.type === 'text')
    .map((blocco) => blocco.text)
    .join('\n')

  const tokenUsati = tokenInput + tokenOutput
  const costo =
    (tokenInput / 1_000_000) * PREZZO_PER_MILIONE_TOKEN.input +
    (tokenOutput / 1_000_000) * PREZZO_PER_MILIONE_TOKEN.output

  // --- 8. Log ------------------------------------------------------------------
  await db.from('log').insert({
    utente_id: user.id,
    domanda,
    risposta: testoFinale,
    pagine_lette: pagineLette,
    token_usati: tokenUsati,
    costo,
  })

  return NextResponse.json({ risposta: testoFinale, pagineLette })
}
