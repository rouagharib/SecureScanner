import { useState, useRef } from 'react'
import { Upload, FolderOpen, GitBranch, AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import '../components/Layout.css'
import './Scanner.css'

const mockResults = [
  {
    id: 1, severity: 'critical', type: 'SQL Injection', file: 'src/db/queries.js', line: 42,
    description: 'User input is directly concatenated into an SQL query without sanitization.',
    fix: 'Use parameterized queries or prepared statements instead of string concatenation.',
    code: "const q = `SELECT * FROM users WHERE id = ${req.params.id}`"
  },
  {
    id: 2, severity: 'high', type: 'XSS Vulnerability', file: 'src/views/profile.jsx', line: 87,
    description: 'Unsanitized user data is rendered directly using innerHTML.',
    fix: 'Use textContent instead of innerHTML, or sanitize input with DOMPurify.',
    code: "element.innerHTML = user.bio"
  },
  {
    id: 3, severity: 'high', type: 'Exposed Secret', file: '.env.example', line: 3,
    description: 'Hardcoded API key found in source file.',
    fix: 'Move secrets to environment variables and add .env to .gitignore.',
    code: 'API_KEY="sk-prod-abc123xyz789..."'
  },
  {
    id: 4, severity: 'medium', type: 'Weak Authentication', file: 'src/auth/login.js', line: 21,
    description: 'Password hashing uses MD5 which is cryptographically broken.',
    fix: 'Use bcrypt, argon2, or scrypt for password hashing.',
    code: "const hash = md5(password)"
  },
  {
    id: 5, severity: 'medium', type: 'Missing Input Validation', file: 'src/api/user.js', line: 55,
    description: 'Request body is used without any schema validation.',
    fix: 'Validate all inputs using a schema validation library like Joi or Zod.',
    code: "const { email, role } = req.body // no validation"
  },
  {
    id: 6, severity: 'low', type: 'Debug Mode Enabled', file: 'config/app.js', line: 8,
    description: 'Application is running with debug mode enabled in production.',
    fix: 'Set DEBUG=false in production environment.',
    code: "DEBUG=true"
  },
]

const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 }
const sevColors = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }

export default function SASTScanner() {
  const [tab, setTab] = useState('upload')
  const [files, setFiles] = useState([])
  const [gitUrl, setGitUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all')
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(dropped)
  }

  const handleFiles = (e) => setFiles(Array.from(e.target.files))

  const startScan = () => {
    setScanning(true)
    setResults(null)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setScanning(false)
          setResults(mockResults)
          return 100
        }
        return p + Math.random() * 12
      })
    }, 200)
  }

  const filtered = results
    ? (filter === 'all' ? results : results.filter(r => r.severity === filter)).sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])
    : []

  const counts = results ? {
    critical: results.filter(r => r.severity === 'critical').length,
    high: results.filter(r => r.severity === 'high').length,
    medium: results.filter(r => r.severity === 'medium').length,
    low: results.filter(r => r.severity === 'low').length,
  } : null

  return (
    <div className="scanner-page">
      <div className="page-header">
        <h1 className="page-title">Code Scanner</h1>
        <p className="page-subtitle">Static Application Security Testing (SAST)</p>
      </div>

      {!results && !scanning && (
        <div className="card scan-setup">
          <div className="card-body">
            <div className="tabs">
              <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
                <Upload size={15} /> Upload Files
              </button>
              <button className={`tab ${tab === 'git' ? 'active' : ''}`} onClick={() => setTab('git')}>
                <GitBranch size={15} /> Git Repository
              </button>
            </div>

            {tab === 'upload' ? (
              <div
                className="dropzone"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current.click()}
              >
                <input ref={fileRef} type="file" multiple hidden onChange={handleFiles} />
                <FolderOpen size={32} strokeWidth={1.25} />
                <h3>Drop your project folder here</h3>
                <p>or click to browse files</p>
                {files.length > 0 && (
                  <div className="file-pills">
                    {files.slice(0, 5).map((f, i) => (
                      <span key={i} className="file-pill">{f.name}</span>
                    ))}
                    {files.length > 5 && <span className="file-pill">+{files.length - 5} more</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="git-input-area">
                <div className="input-group">
                  <label className="input-label">Repository URL</label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={gitUrl}
                    onChange={e => setGitUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="scan-actions">
              <button
                className="btn btn-primary"
                disabled={tab === 'upload' ? files.length === 0 : !gitUrl}
                onClick={startScan}
              >
                <Code2 size={16} /> Start SAST Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {scanning && (
        <div className="card">
          <div className="card-body scanning-state">
            <div className="scan-anim">
              <div className="scan-ring" />
              <Code2 size={22} strokeWidth={1.5} />
            </div>
            <h3>Analyzing your code...</h3>
            <p>Parsing files and applying security rules</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <span className="progress-pct">{Math.min(Math.round(progress), 100)}%</span>
          </div>
        </div>
      )}

      {results && (
        <>
          <div className="results-header">
            <div className="severity-summary">
              {Object.entries(counts).map(([sev, count]) => (
                <div key={sev} className={`sev-chip sev-chip--${sev} ${filter === sev ? 'selected' : ''}`} onClick={() => setFilter(filter === sev ? 'all' : sev)}>
                  <span className="sev-count">{count}</span>
                  <span className="sev-label">{sev}</span>
                </div>
              ))}
            </div>
            <div className="results-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => { setResults(null); setFiles([]); setProgress(0) }}>
                New Scan
              </button>
              <button className="btn btn-primary btn-sm">Export Report</button>
            </div>
          </div>

          <div className="vuln-list-wrap">
            {filtered.map(v => (
              <div key={v.id} className="vuln-item card">
                <div className="vuln-summary" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
                  <span className={`badge ${sevColors[v.severity]}`}>{v.severity}</span>
                  <span className="vuln-type">{v.type}</span>
                  <span className="vuln-file">{v.file}<span className="vuln-line">:{v.line}</span></span>
                  <span className="vuln-toggle">
                    {expanded === v.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>
                {expanded === v.id && (
                  <div className="vuln-detail">
                    <div className="vuln-section">
                      <h4>Description</h4>
                      <p>{v.description}</p>
                    </div>
                    <div className="vuln-code">
                      <code>{v.code}</code>
                    </div>
                    <div className="vuln-section vuln-fix">
                      <CheckCircle2 size={14} />
                      <p>{v.fix}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
