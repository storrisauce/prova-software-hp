import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './login-form'

export default async function PaginaLogin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/chiedi')
  }

  return (
    <main>
      <h1>Accedi</h1>
      <LoginForm />
    </main>
  )
}
