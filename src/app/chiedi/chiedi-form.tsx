'use client'

import { useState, type FormEvent } from 'react'

type PaginaLetta = { cervello: string; percorso: string }

export function ChiediForm() {
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

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="domanda">Domanda</label>
          <textarea
            id="domanda"
            value={domanda}
            onChange={(e) => setDomanda(e.target.value)}
            placeholder="Scrivi la tua domanda"
            rows={4}
            required
          />
        </div>
        <button type="submit" disabled={caricamento}>
          {caricamento ? 'Sto cercando...' : 'Invia'}
        </button>
      </form>

      {errore && <p className="errore">{errore}</p>}

      {risposta && (
        <div className="risposta">
          <h2>Risposta</h2>
          <p>{risposta}</p>

          {pagineLette.length > 0 && (
            <>
              <h3>Pagine consultate</h3>
              <ul className="pagine-lette">
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
    </div>
  )
}
