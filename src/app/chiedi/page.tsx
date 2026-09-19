import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChiediForm } from './chiedi-form'

export default async function PaginaChiedi() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <main>
      <h1>Fai una domanda</h1>
      <ChiediForm />
    </main>
  )
}
