import { useState } from 'react'
import { Check, Zap, Users, Shield } from 'lucide-react'
import { useToast } from '../components/Toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const plans = {
  free: {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals getting started',
    features: [
      '5 scans per month',
      '1 file per scan',
      'Basic vulnerability reports',
      'Email support',
    ],
    button: 'Current Plan',
    popular: false,
  },
  pro: {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For professional developers',
    features: [
      '100 scans per month',
      'Unlimited files per scan',
      'AI-powered analysis',
      'PDF report export',
      'Priority email support',
      'Git repository scanning',
    ],
    button: 'Upgrade to Pro',
    popular: true,
  },
  team: {
    name: 'Team',
    price: '$49',
    period: '/month',
    description: 'For teams and organizations',
    features: [
      'Unlimited scans',
      'Concurrent scanning',
      'Team member access',
      'API access',
      'Slack/Webhook integration',
      '24/7 priority support',
      'SAML SSO (coming soon)',
    ],
    button: 'Contact Sales',
    popular: false,
  },
}

export default function Pricing() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(null)

  const handleUpgrade = async (plan) => {
    if (plan === 'free') return
    if (plan === 'team') {
      window.location.href = 'mailto:sales@securescan.com?subject=Team Plan Inquiry'
      return
    }

    setLoading(plan)
    try {
      const response = await fetch(`${API_URL}/api/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ plan })
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        addToast('Failed to create checkout session', 'error')
      }
    } catch {
      addToast('Could not connect to server', 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="pricing-page">
      <div className="page-header" style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 48px' }}>
        <h1 className="page-title">Simple, transparent pricing</h1>
        <p className="page-subtitle">Choose the plan that's right for you. All plans include core security scanning features.</p>
      </div>

      <div className="pricing-grid">
        {Object.entries(plans).map(([key, plan]) => (
          <div key={key} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <div className="pricing-card-header">
              <h3>{plan.name}</h3>
              <div className="price">
                <span className="amount">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
              <p className="description">{plan.description}</p>
            </div>
            <div className="pricing-card-features">
              {plan.features.map((feature, i) => (
                <div key={i} className="feature">
                  <Check size={16} /> <span>{feature}</span>
                </div>
              ))}
            </div>
            <button
              className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleUpgrade(key)}
              disabled={loading === key || plan.name === 'Free'}
            >
              {loading === key ? 'Redirecting...' : plan.button}
            </button>
          </div>
        ))}
      </div>

      <div className="faq-section">
        <h3>Frequently Asked Questions</h3>
        <div className="faq-grid">
          <div className="faq-item">
            <strong>Can I switch plans?</strong>
            <p>Yes, you can upgrade or downgrade anytime. Changes take effect at the end of your billing cycle.</p>
          </div>
          <div className="faq-item">
            <strong>What payment methods?</strong>
            <p>We accept all major credit cards via Stripe. Enterprise invoicing available for Team plans.</p>
          </div>
          <div className="faq-item">
            <strong>Cancel anytime?</strong>
            <p>Yes, you can cancel your subscription with one click. No hidden fees.</p>
          </div>
        </div>
      </div>
    </div>
  )
}