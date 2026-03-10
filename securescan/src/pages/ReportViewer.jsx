import { useState } from 'react'
import { FileText, Download, Eye, Calendar, Code2, Globe, ChevronRight, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react'
import '../components/Layout.css'
import './ReportViewer.css'

const reports = [
  {
    id: 1,
    name: 'backend-api/',
    type: 'SAST',
    date: 'Mar 10, 2026',
    duration: '1m 24s',
    critical: 3, high: 8, medium: 12, low: 4,
    files: 47,
    status: 'completed',
    vulns: [
      { severity: 'critical', type: 'SQL Injection', file: 'src/db/queries.js:42', fix: 'Use parameterized queries.' },
      { severity: 'critical', type: 'SQL Injection', file: 'src/db/users.js:18', fix: 'Use parameterized queries.' },
      { severity: 'critical', type: 'Exposed Secret', file: '.env.example:3', fix: 'Move to environment variables.' },
      { severity: 'high', type: 'XSS', file: 'src/views/profile.jsx:87', fix: 'Sanitize output.' },
      { severity: 'high', type: 'Weak Auth', file: 'src/auth/login.js:21', fix: 'Use bcrypt.' },
      { severity: 'medium', type: 'Missing Validation', file: 'src/api/user.js:55', fix: 'Add schema validation.' },
    ]
  },
  {
    id: 2,
    name: 'https://myapp.io',
    type: 'DAST',
    date: 'Mar 10, 2026',
    duration: '3m 12s',
    critical: 1, high: 4, medium: 7, low: 2,
    files: null,
    status: 'completed',
    vulns: [
      { severity: 'critical', type: 'SQL Injection', file: 'POST /api/login', fix: 'Parameterize queries.' },
      { severity: 'high', type: 'XSS', file: 'GET /search?q=', fix: 'Encode output.' },
      { severity: 'medium', type: 'Missing Headers', file: 'All responses', fix: 'Add security headers.' },
    ]
  },
  {
    id: 3,
    name: 'auth-service/',
    type: 'SAST',
    date: 'Mar 9, 2026',
    duration: '0m 48s',
    critical: 0, high: 2, medium: 5, low: 1,
    files: 23,
    status: 'completed',
    vulns: [
      { severity: 'high', type: 'Weak Password Hashing', file: 'src/hash.js:10', fix: 'Use bcrypt or argon2.' },
      { severity: 'medium', type: 'Debug Mode Enabled', file: 'config/app.js:8', fix: 'Disable in production.' },
    ]
  },
]

const sevColors = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }

function RiskScore({ c, h, m, l }) {
  const score = c * 40 + h * 15 + m * 5 + l
  if (score === 0) return <span className="risk-score risk-score--safe">Safe</span>
  if (score < 30) return <span className="risk-score risk-score--low">Low</span>
  if (score < 80) return <span className="risk-score risk-score--medium">Medium</span>
  if (score < 150) return <span className="risk-score risk-score--high">High</span>
  return <span className="risk-score risk-score--critical">Critical</span>
}

export default function ReportViewer() {
  const [selected, setSelected] = useState(null)

  const report = selected != null ? reports.find(r => r.id === selected) : null

  if (report) {
    return (
      <div className="report-detail-page">
        <div className="report-detail-header">
          <button className="back-btn" onClick={() => setSelected(null)}>
            ← All Reports
          </button>
          <div className="report-detail-actions">
            <button className="btn btn-secondary btn-sm"><Download size={14} /> Download PDF</button>
          </div>
        </div>

        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className={`report-type-icon ${report.type === 'SAST' ? 'blue' : 'purple'}`}>
              {report.type === 'SAST' ? <Code2 size={16} /> : <Globe size={16} />}
            </div>
            <div>
              <h1 className="page-title" style={{ fontFamily: 'var(--mono)', fontSize: 17 }}>{report.name}</h1>
              <p className="page-subtitle">{report.type} Scan — {report.date} — {report.duration}</p>
            </div>
          </div>
        </div>

        <div className="detail-stats">
          {[
            { label: 'Critical', val: report.critical, cls: 'danger' },
            { label: 'High', val: report.high, cls: 'high' },
            { label: 'Medium', val: report.medium, cls: 'warning' },
            { label: 'Low', val: report.low, cls: 'success' },
          ].map(({ label, val, cls }) => (
            <div key={label} className={`detail-stat detail-stat--${cls}`}>
              <span className="detail-stat-val">{val}</span>
              <span className="detail-stat-label">{label}</span>
            </div>
          ))}
          <div className="detail-stat detail-stat--neutral">
            <span className="detail-stat-val"><RiskScore c={report.critical} h={report.high} m={report.medium} l={report.low} /></span>
            <span className="detail-stat-label">Risk Level</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ paddingBottom: 16 }}>
            <span className="card-title">Vulnerabilities ({report.vulns.length})</span>
          </div>
          <div style={{ padding: '0 0 8px' }}>
            {report.vulns.map((v, i) => (
              <div key={i} className="detail-vuln-row">
                <span className={`badge ${sevColors[v.severity]}`}>{v.severity}</span>
                <span className="detail-vuln-type">{v.type}</span>
                <span className="detail-vuln-file">{v.file}</span>
                <span className="detail-vuln-fix"><CheckCircle2 size={12} /> {v.fix}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="report-list-page">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">All scan results and generated reports</p>
      </div>

      <div className="report-list">
        {reports.map(r => (
          <div key={r.id} className="report-card card" onClick={() => setSelected(r.id)}>
            <div className="report-card-left">
              <div className={`report-type-icon ${r.type === 'SAST' ? 'blue' : 'purple'}`}>
                {r.type === 'SAST' ? <Code2 size={16} strokeWidth={1.75} /> : <Globe size={16} strokeWidth={1.75} />}
              </div>
              <div className="report-card-info">
                <span className="report-card-name">{r.name}</span>
                <div className="report-card-meta">
                  <span>{r.type}</span>
                  <span>·</span>
                  <Calendar size={12} />
                  <span>{r.date}</span>
                  <span>·</span>
                  <span>{r.duration}</span>
                  {r.files && <><span>·</span><span>{r.files} files</span></>}
                </div>
              </div>
            </div>

            <div className="report-card-right">
              <div className="report-badges">
                {r.critical > 0 && <span className="badge badge-critical">{r.critical} critical</span>}
                {r.high > 0 && <span className="badge badge-high">{r.high} high</span>}
                {r.medium > 0 && <span className="badge badge-medium">{r.medium} medium</span>}
              </div>
              <RiskScore c={r.critical} h={r.high} m={r.medium} l={r.low} />
              <ChevronRight size={16} className="report-arrow" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
