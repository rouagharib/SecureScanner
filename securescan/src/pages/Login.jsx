import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react'
import './Auth.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      console.log('Login response:', data)

      if (!response.ok) {
        setError(data.detail || 'Invalid email or password')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      console.log('user role:', data.user?.role)
      console.log('full data:', JSON.stringify(data))
      onLogin(data.user)
      if (data.user?.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }

    } catch (err) {
      setError('Could not connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <ShieldCheck size={24} strokeWidth={2} />
          <span>SecureScan</span>
        </div>
        <div className="auth-tagline">
          <h1>Detect vulnerabilities<br />before they're exploited.</h1>
          <p>Static analysis, dynamic scanning, and AI-powered detection — all in one platform.</p>
        </div>
        <div className="auth-features">
          {['SAST & DAST Analysis', 'AI False Positive Filtering', 'Automated PDF Reports'].map(f => (
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
            <h2>Welcome back</h2>
            <p>Sign in to your account</p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <div className="label-row">
                <label className="input-label">Password</label>
                <button
                  type="button"
                  className="auth-link-small"
                  onClick={() => setForgotMode(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrap">
                <input
                  className="input"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="input-toggle" onClick={() => setShow(!show)}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
          </p>
        </div>

        {/* Forgot Password Modal */}
        {forgotMode && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="auth-card" style={{ maxWidth: 380, width: '100%', margin: 20 }}>
              <div className="auth-card-header">
                <h2>Reset password</h2>
                <p>Enter your email and we'll send you a reset link</p>
              </div>
              {forgotSent ? (
                <p style={{ color: 'var(--success)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  ✓ If this email exists, a reset link has been sent!
                </p>
              ) : (
                <div className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Email address</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary auth-submit"
                    onClick={async () => {
                      await fetch('http://127.0.0.1:8000/api/auth/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: forgotEmail })
                      })
                      setForgotSent(true)
                    }}
                  >
                    Send reset link
                  </button>
                </div>
              )}
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false) }}
                style={{ width: '100%', textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}