import { HashRouter, Route, Routes } from 'react-router-dom'
import Accueil from './Accueil.tsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<Accueil />} />
      </Routes>
    </HashRouter>
  )
}
