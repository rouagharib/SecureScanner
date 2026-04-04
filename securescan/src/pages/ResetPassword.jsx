import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import './Auth.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Reset failed')
        return
      }

      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)

    } catch (err) {
      setError('Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={{ justifyContent: 'center' }}>
      <div className="auth-card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="auth-card-header">
          <div style={{ marginBottom: 16 }}>
            <ShieldCheck size={32} strokeWidth={1.5} color="#1a56db" />
          </div>
          <h2>Reset your password</h2>
          <p>Choose a new password for your account</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: 'var(--success)', fontWeight: 500 }}>
              ✓ Password reset successfully!
            </p>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>
              Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="input-group">
              <label className="input-label">New password</label>
              <input
                className="input"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Confirm password</label>
              <input
                className="input"
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Reset password <ArrowRight size={16} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}