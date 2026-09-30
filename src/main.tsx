import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const racine = createRoot(document.getElementById('root')!)

// Aperçu de développement sur données fictives en mémoire, sans Supabase ni mot de passe.
// Absent du build de production.
if (import.meta.env.DEV && window.location.hash.startsWith('#/apercu')) {
  import('./apercu/Apercu.tsx').then(({ default: Apercu }) =>
    racine.render(
      <StrictMode>
        <Apercu />
      </StrictMode>,
    ),
  )
} else {
  racine.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
