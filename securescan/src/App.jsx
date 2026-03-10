import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SASTScanner from './pages/SASTScanner'
import DASTScanner from './pages/DASTScanner'
import ReportViewer from './pages/ReportViewer'
import Layout from './components/Layout'

export default function App() {
  const [authed, setAuthed] = useState(true)
  const user = { name: 'Roua G.', email: 'rouagharib@gmail.com' }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setAuthed(true)} />} />
        <Route path="/register" element={<Register onRegister={() => setAuthed(true)} />} />
        <Route path="/" element={authed ? <Layout user={user} onLogout={() => setAuthed(false)} /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sast" element={<SASTScanner />} />
          <Route path="dast" element={<DASTScanner />} />
          <Route path="report" element={<ReportViewer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
