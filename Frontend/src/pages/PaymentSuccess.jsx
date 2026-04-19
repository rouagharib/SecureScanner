import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from '../components/Toast'
import '../components/Layout.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [verifying, setVerifying] = useState(true)
  const sessionId = searchParams.get('session_id')
  const planKey = searchParams.get('plan_key')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !planKey) {
        addToast('Invalid payment session', 'error')
        navigate('/pricing')
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/payments/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ session_id: sessionId, plan_key: planKey })
        })

        if (response.ok) {
          // Update local user data
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          user.subscription_plan = planKey
          user.role = planKey.includes('pro') ? 'pro_user' : 'enterprise_user'
          localStorage.setItem('user', JSON.stringify(user))
          
          addToast('Payment successful! Your account has been upgraded.', 'success')
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard')
          }, 3000)
        } else {
          addToast('Payment verification failed. Please contact support.', 'error')
          setTimeout(() => {
            navigate('/pricing')
          }, 3000)
        }
      } catch (error) {
        console.error('Verification error:', error)
        addToast('Failed to verify payment', 'error')
        setTimeout(() => {
          navigate('/pricing')
        }, 3000)
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [sessionId, planKey, navigate, addToast])

  return (
    <div className="payment-success-page" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '60vh',
      textAlign: 'center'
    }}>
      <div className="card" style={{ padding: '48px', maxWidth: '500px' }}>
        {verifying ? (
          <>
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 24px', color: 'var(--accent)' }} />
            <h2>Verifying your payment...</h2>
            <p style={{ color: 'var(--text3)', marginTop: '8px' }}>Please wait while we confirm your subscription.</p>
          </>
        ) : (
          <>
            <CheckCircle2 size={48} style={{ margin: '0 auto 24px', color: 'var(--success)' }} />
            <h2>Payment Successful! 🎉</h2>
            <p style={{ color: 'var(--text3)', marginTop: '8px' }}>
              Thank you for upgrading! Your account has been updated.
            </p>
            <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '16px' }}>
              Redirecting to dashboard...
            </p>
          </>
        )}
      </div>
    </div>
  )
}