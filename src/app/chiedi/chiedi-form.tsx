'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PaginaLetta = { cervello: string; percorso: string }

export function ChiediForm() {
  const router = useRouter()
  const [domanda, setDomanda] = useState('')
  const [risposta, setRisposta] = useState<string | null>(null)
  const [pagineLette, setPagineLette] = useState<PaginaLetta[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [caricamento, setCaricamento] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setRisposta(null)
    setCaricamento(true)

    try {
      const rispostaHttp = await fetch('/api/chiedi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domanda }),
      })

      const dati = await rispostaHttp.json()

      if (!rispostaHttp.ok) {
        setErrore(dati.errore ?? 'Errore imprevisto.')
        return
      }

      setRisposta(dati.risposta)
      setPagineLette(dati.pagineLette ?? [])
    } catch {
      setErrore('Errore di rete.')
    } finally {
      setCaricamento(false)
    }
  }

  async function handleEsci() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={domanda}
          onChange={(e) => setDomanda(e.target.value)}
          placeholder="Scrivi la tua domanda"
          rows={4}
          cols={60}
          required
        />
        <br />
        <button type="submit" disabled={caricamento}>
          {caricamento ? 'Sto cercando...' : 'Invia'}
        </button>
      </form>

      {errore && <p>{errore}</p>}

      {risposta && (
        <div>
          <h2>Risposta</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{risposta}</p>

          {pagineLette.length > 0 && (
            <>
              <h3>Pagine consultate</h3>
              <ul>
                {pagineLette.map((pagina, indice) => (
                  <li key={indice}>
                    {pagina.cervello} / {pagina.percorso}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <hr />
      <button type="button" onClick={handleEsci}>
        Esci
      </button>
    </div>
  )
}
