import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client Supabase per codice che gira sul server (Server Component, API route).
// Legge la sessione dai cookie della richiesta, così sa chi è l'utente loggato.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chiamato da un Server Component durante il rendering: qui non si
            // possono scrivere cookie. Non è un problema, la sessione viene
            // comunque aggiornata quando serve da un posto che può farlo
            // (es. la nostra API route).
          }
        },
      },
    }
  )
}
