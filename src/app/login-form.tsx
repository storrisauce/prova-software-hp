'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [caricamento, setCaricamento] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setCaricamento(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setCaricamento(false)

    if (error) {
      setErrore('Email o password non corretti.')
      return
    }

    router.push('/chiedi')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <br />
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <br />
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {errore && <p>{errore}</p>}
      <button type="submit" disabled={caricamento}>
        {caricamento ? 'Accesso...' : 'Accedi'}
      </button>
    </form>
  )
}
