import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShieldAlert, CheckCircle2, Clock, ArrowRight, Code2, Globe, TrendingUp } from 'lucide-react'
import '../components/Layout.css'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total_scans: 0, total_vulnerabilities: 0, critical: 0, high: 0 })
  const [recentScans, setRecentScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        const [statsRes, historyRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/history/stats', { headers }),
          fetch('http://127.0.0.1:8000/api/history/?page=1&limit=5', { headers })
        ])

        const statsData = await statsRes.json()
        const historyData = await historyRes.json()
        setStats(statsData)
        // Handle both old array and new paginated format
        const scans = Array.isArray(historyData) ? historyData : (historyData.data || [])
        setRecentScans(scans.slice(0, 5))
      } catch (err) {
        console.error('Could not load dashboard data')
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

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your security scans and findings</p>
      </div>

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
        <button className="action-card" onClick={() => navigate('/sast')}>
          <div className="action-icon action-icon--blue">
            <Code2 size={20} strokeWidth={1.75} />
          </div>
          <div className="action-content">
            <h3>Scan Source Code</h3>
            <p>Upload files or connect a Git repo</p>
          </div>
          <ArrowRight size={16} className="action-arrow" />
        </button>
        <button className="action-card" onClick={() => navigate('/dast')}>
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