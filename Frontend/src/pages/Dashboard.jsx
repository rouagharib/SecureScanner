import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShieldAlert, CheckCircle2, Clock, ArrowRight, Code2, Globe, TrendingUp, CreditCard, AlertCircle } from 'lucide-react'
import '../components/Layout.css'
import './Dashboard.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total_scans: 0, total_vulnerabilities: 0, critical: 0, high: 0 })
  const [recentScans, setRecentScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState({
    plan: 'free',
    plan_name: 'Free',
    limit: 5,
    used: 0,
    remaining: 5,
    reset_date: null
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        
        // Try to fetch usage data from payments endpoint
        let usageData = null
        try {
          const usageRes = await fetch(`${API_URL}/api/payments/usage`, { headers })
          if (usageRes.ok) {
            usageData = await usageRes.json()
          }
        } catch (err) {
          console.log('Usage endpoint not available yet')
        }
        
        const [statsRes, historyRes] = await Promise.all([
          fetch(`${API_URL}/api/history/stats`, { headers }),
          fetch(`${API_URL}/api/history/?page=1&limit=5`, { headers })
        ])

        const statsData = await statsRes.json()
        const historyData = await historyRes.json()
        setStats(statsData)
        
        // Handle both old array and new paginated format
        const scans = Array.isArray(historyData) ? historyData : (historyData.data || [])
        setRecentScans(scans.slice(0, 5))
        
        // Set usage data
        if (usageData) {
          setUsage(usageData)
        } else {
          // Fallback: get from localStorage or use defaults
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          const plan = user.subscription_plan || 'free'
          const limits = { free: 5, pro_monthly: 100, pro_yearly: 100, enterprise_monthly: 999999, enterprise_yearly: 999999 }
          const limit = limits[plan] || 5
          setUsage({
            plan: plan,
            plan_name: plan === 'free' ? 'Free' : plan.includes('pro') ? 'Pro' : 'Enterprise',
            limit: limit,
            used: statsData.total_scans || 0,
            remaining: Math.max(0, limit - (statsData.total_scans || 0)),
            reset_date: null
          })
        }
      } catch (err) {
        console.error('Could not load dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const statCards = [
    { label: 'Total Scans', value: stats.total_scans, icon: TrendingUp, color: 'blue' },
    { label: 'Vulnerabilities Found', value: stats.total_vulnerabilities, icon: ShieldAlert, color: 'red' },
    { label: 'Critical Issues', value: stats.critical, icon: Clock, color: 'yellow' },
    { label: 'High Issues', value: stats.high, icon: CheckCircle2, color: 'green' },
  ]

  const getResetDateText = () => {
    if (!usage.reset_date) return 'next month'
    const date = new Date(usage.reset_date)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getUsagePercentage = () => {
    return (usage.used / usage.limit) * 100
  }

  const isNearLimit = usage.remaining <= 3 && usage.plan === 'free'
  const isAtLimit = usage.remaining === 0

  const handleScanClick = (scanType) => {
    if (usage.remaining === 0 && usage.plan === 'free') {
      const confirm = window.confirm('You have no scans remaining this month. Would you like to upgrade to Pro for more scans?')
      if (confirm) navigate('/pricing')
    } else {
      navigate(scanType)
    }
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your security scans and findings</p>
      </div>

      {/* Usage Banner - Show upgrade prompt if near limit or on free plan */}
      {!loading && usage.plan === 'free' && (
        <div className={`upgrade-banner card ${isAtLimit ? 'urgent' : ''}`} style={{ 
          marginBottom: '24px', 
          background: isAtLimit 
            ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' 
            : isNearLimit 
              ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
              : 'linear-gradient(135deg, #eef2ff, #dbeafe)',
          border: isAtLimit ? '1px solid #fecaca' : isNearLimit ? '1px solid #fde68a' : '1px solid #c7d2fe'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isAtLimit ? (
                <AlertCircle size={24} color="#dc2626" />
              ) : isNearLimit ? (
                <AlertCircle size={24} color="#d97706" />
              ) : (
                <CreditCard size={24} color="#4f46e5" />
              )}
              <div>
                <strong style={{ fontSize: '14px' }}>
                  {isAtLimit 
                    ? '⚠️ Monthly scan limit reached!' 
                    : isNearLimit 
                      ? `⚠️ Only ${usage.remaining} scan${usage.remaining !== 1 ? 's' : ''} remaining this month`
                      : `Free Plan - ${usage.remaining} scans remaining this month`}
                </strong>
                <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text2)' }}>
                  {isAtLimit 
                    ? 'You\'ve used all your free scans. Upgrade to continue scanning.'
                    : isNearLimit
                      ? 'Upgrade to Pro for 100 scans/month + AI-powered analysis'
                      : 'Get unlimited scans, AI analysis, and PDF reports with Pro'}
                </p>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => navigate('/pricing')}
              style={{ whiteSpace: 'nowrap' }}
            >
              Upgrade Now →
            </button>
          </div>
        </div>
      )}

      {/* Usage Progress Bar for Pro/Enterprise users */}
      {!loading && usage.plan !== 'free' && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{usage.plan_name} Plan</span>
              <span style={{ fontSize: '12px', color: 'var(--text3)', marginLeft: '8px' }}>
                {usage.used} / {usage.limit} scans used
              </span>
            </div>
            {usage.reset_date && (
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                Resets {getResetDateText()}
              </span>
            )}
          </div>
          <div style={{ 
            height: '8px', 
            background: 'var(--border)', 
            borderRadius: '4px', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: `${Math.min(getUsagePercentage(), 100)}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card card">
            <div className={`stat-icon stat-icon--${color}`}>
              <Icon size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div className="stat-value">{loading ? '—' : value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="action-card" onClick={() => handleScanClick('/sast')}>
          <div className="action-icon action-icon--blue">
            <Code2 size={20} strokeWidth={1.75} />
          </div>
          <div className="action-content">
            <h3>Scan Source Code</h3>
            <p>Upload files or connect a Git repo</p>
          </div>
          <ArrowRight size={16} className="action-arrow" />
        </button>
        <button className="action-card" onClick={() => handleScanClick('/dast')}>
          <div className="action-icon action-icon--purple">
            <Globe size={20} strokeWidth={1.75} />
          </div>
          <div className="action-content">
            <h3>Scan Web Application</h3>
            <p>Enter a URL to start dynamic analysis</p>
          </div>
          <ArrowRight size={16} className="action-arrow" />
        </button>
      </div>

      {/* Recent scans */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Scans</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/report')}>View all reports</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state">
              <p>Loading...</p>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="empty-state">
              <h3>No scans yet</h3>
              <p>Run your first scan to see results here</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleScanClick('/sast')}>
                  <Code2 size={14} /> Code Scan
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleScanClick('/dast')}>
                  <Globe size={14} /> URL Scan
                </button>
              </div>
            </div>
          ) : (
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Critical</th>
                  <th>High</th>
                  <th>Medium</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => (
                  <tr key={scan.id} onClick={() => navigate('/report')} className="scan-row">
                    <td className="scan-name">{scan.target}</td>
                    <td><span className="badge badge-info">{scan.type}</span></td>
                    <td>
                      {scan.critical > 0
                        ? <span className="badge badge-critical">{scan.critical}</span>
                        : <span className="count-zero">—</span>}
                    </td>
                    <td>
                      {scan.high > 0
                        ? <span className="badge badge-high">{scan.high}</span>
                        : <span className="count-zero">—</span>}
                    </td>
                    <td>
                      {scan.medium > 0
                        ? <span className="badge badge-medium">{scan.medium}</span>
                        : <span className="count-zero">—</span>}
                    </td>
                    <td className="scan-time">{scan.date}</td>
                    <td><ArrowRight size={14} className="row-arrow" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}