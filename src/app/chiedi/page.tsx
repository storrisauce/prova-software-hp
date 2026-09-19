import { ChiediForm } from './chiedi-form'

// Login disattivato per ora: questa pagina era protetta da un controllo di
// sessione che reindirizzava a "/" se mancante. Per riattivarlo, vedi il
// commento in src/app/api/chiedi/route.ts.
export default function PaginaChiedi() {
  return (
    <main>
      <h1>Fai una domanda</h1>
      <ChiediForm />
    </main>
  )
}
