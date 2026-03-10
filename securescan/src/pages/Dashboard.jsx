import { useNavigate } from 'react-router-dom'
import { ShieldAlert, CheckCircle2, Clock, AlertTriangle, ArrowRight, Code2, Globe, TrendingUp } from 'lucide-react'
import '../components/Layout.css'
import './Dashboard.css'

const stats = [
  { label: 'Total Scans', value: '24', icon: TrendingUp, color: 'blue' },
  { label: 'Vulnerabilities Found', value: '137', icon: ShieldAlert, color: 'red' },
  { label: 'Issues Resolved', value: '89', icon: CheckCircle2, color: 'green' },
  { label: 'Scans In Progress', value: '2', icon: Clock, color: 'yellow' },
]

const recentScans = [
  { name: 'backend-api/', type: 'SAST', time: '2 hours ago', critical: 3, high: 8, medium: 12, status: 'done' },
  { name: 'https://myapp.io', type: 'DAST', time: '5 hours ago', critical: 1, high: 4, medium: 7, status: 'done' },
  { name: 'auth-service/', type: 'SAST', time: '1 day ago', critical: 0, high: 2, medium: 5, status: 'done' },
  { name: 'https://staging.io', type: 'DAST', time: '2 days ago', critical: 0, high: 1, medium: 3, status: 'done' },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your security scans and findings</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card card">
            <div className={`stat-icon stat-icon--${color}`}>
              <Icon size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div className="stat-value">{value}</div>
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
          <table className="scan-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Type</th>
                <th>Critical</th>
                <th>High</th>
                <th>Medium</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((scan, i) => (
                <tr key={i} onClick={() => navigate('/report')} className="scan-row">
                  <td className="scan-name">{scan.name}</td>
                  <td>
                    <span className={`badge badge-info`}>{scan.type}</span>
                  </td>
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
                  <td className="scan-time">{scan.time}</td>
                  <td><ArrowRight size={14} className="row-arrow" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
