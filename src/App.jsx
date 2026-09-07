import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Splash from './pages/Splash.jsx'

const Vision = lazy(() => import('./pages/Vision.jsx'))

export default function App() {
  return (
    <Suspense fallback={<div className="splash" />}>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/vision" element={<Vision />} />
      </Routes>
    </Suspense>
  )
}
