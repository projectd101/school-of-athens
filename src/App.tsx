import { BrowserRouter, Routes, Route } from 'react-router-dom'
import InteractivePainting from './components/InteractivePainting'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InteractivePainting />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
