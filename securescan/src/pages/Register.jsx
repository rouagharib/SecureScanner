import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import './Auth.css'

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      onRegister()
      navigate('/dashboard')
    }, 900)
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <ShieldCheck size={24} strokeWidth={2} />
          <span>SecureScan</span>
        </div>
        <div className="auth-tagline">
          <h1>Security scanning<br />made accessible.</h1>
          <p>Get started in minutes. Analyze your code and web apps for vulnerabilities automatically.</p>
        </div>
        <div className="auth-features">
          {['Upload code or Git repo', 'Scan any live web app', 'Clear, actionable reports'].map(f => (
            <div key={f} className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Create account</h2>
            <p>Start scanning for free</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input className="input" type="text" placeholder="Your name" value={form.name} onChange={set('name')} required />
            </div>

            <div className="input-group">
              <label className="input-label">Email address</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Create account <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
