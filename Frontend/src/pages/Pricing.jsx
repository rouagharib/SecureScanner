import { useState } from 'react'
import { Check, Zap, Building2, Calendar } from 'lucide-react'
import { useToast } from '../components/Toast'
import './Pricing.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Pricing() {
  const { addToast } = useToast()
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'yearly'
  const [loading, setLoading] = useState(null)

  const plans = {
    free: {
      name: 'Free',
      price: billingCycle === 'monthly' ? '$0' : '$0',
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
      name: 'SecureScan Pro',
      price: billingCycle === 'monthly' ? '$12' : '$9',
      period: billingCycle === 'monthly' ? '/month' : '/month (billed annually)',
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
      planKey: billingCycle === 'monthly' ? 'pro_monthly' : 'pro_yearly',
    },
    enterprise: {
      name: 'SecureScan Enterprise',
      price: billingCycle === 'monthly' ? '$39' : '$29',
      period: billingCycle === 'monthly' ? '/month' : '/month (billed annually)',
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
      button: 'Upgrade to Enterprise',
      popular: false,
      planKey: billingCycle === 'monthly' ? 'enterprise_monthly' : 'enterprise_yearly',
    },
  }

  const handleUpgrade = async (planKey) => {
    if (!planKey) return

    setLoading(planKey)
    try {
      const response = await fetch(`${API_URL}/api/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ plan_key: planKey })
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
        <p className="page-subtitle">Choose the plan that's right for you.</p>
        
        {/* Billing Toggle */}
        <div className="billing-toggle">
          <button 
            className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`toggle-option ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly <span className="save-badge">Save 25%</span>
          </button>
        </div>
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
              onClick={() => handleUpgrade(plan.planKey)}
              disabled={loading === plan.planKey || plan.name === 'Free'}
            >
              {loading === plan.planKey ? 'Redirecting...' : plan.button}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}