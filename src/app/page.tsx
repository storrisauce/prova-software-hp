import { redirect } from 'next/navigation'

// Login disattivato per ora (vedi il commento in src/app/api/chiedi/route.ts):
// la pagina di ingresso porta direttamente al modulo della domanda.
// Per riattivare il login, rimetti qui il controllo sessione + <LoginForm />
// (il file src/app/login-form.tsx è rimasto invariato, pronto per essere
// ricollegato).
export default function Root() {
  redirect('/chiedi')
}
