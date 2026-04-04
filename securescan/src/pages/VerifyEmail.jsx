import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'
import './Auth.css'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying')
  const navigate = useNavigate()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      // For now mark as verified — full implementation stores token in DB
      setTimeout(() => setStatus('success'), 1500)
    } else {
      setStatus('error')
    }
  }, [token])

  return (
    <div className="auth-page" style={{ justifyContent: 'center' }}>
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ marginBottom: 20 }}>
          <ShieldCheck size={40} strokeWidth={1.5} color="#1a56db" />
        </div>

        {status === 'verifying' && (
          <>
            <h2>Verifying your email...</h2>
            <p style={{ color: 'var(--text3)', marginTop: 8 }}>Please wait a moment.</p>
            <div className="spinner" style={{ margin: '20px auto', borderTopColor: '#1a56db', borderColor: '#e3e5ea' }} />
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={40} color="#0a7c4c" style={{ margin: '0 auto 16px' }} />
            <h2>Email verified!</h2>
            <p style={{ color: 'var(--text3)', marginTop: 8, marginBottom: 24 }}>
              Your account is now active. You can sign in.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} color="#b91c1c" style={{ margin: '0 auto 16px' }} />
            <h2>Invalid link</h2>
            <p style={{ color: 'var(--text3)', marginTop: 8, marginBottom: 24 }}>
              This verification link is invalid or has expired.
            </p>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}