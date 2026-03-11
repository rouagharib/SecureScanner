import { useState, useRef } from 'react'
import { Upload, FolderOpen, GitBranch, CheckCircle2, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import '../components/Layout.css'
import './Scanner.css'

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

  const startScan = async () => {
    setScanning(true)
    setResults(null)
    setProgress(0)

    try {
      const formData = new FormData()

      if (tab === 'upload' && files.length > 0) {
        formData.append('file', files[0])
      } else if (tab === 'git') {
        alert('Git scanning coming soon!')
        setScanning(false)
        return
      }

      const interval = setInterval(() => {
        setProgress(p => p >= 90 ? 90 : p + 10)
      }, 300)

      const response = await fetch('http://127.0.0.1:8000/api/scan/sast', {
        method: 'POST',
        body: formData
      })

      clearInterval(interval)
      setProgress(100)

      if (!response.ok) {
        const err = await response.json()
        alert(err.detail || 'Scan failed')
        setScanning(false)
        return
      }

      const data = await response.json()
      setResults(data.vulnerabilities)

    } catch (error) {
      alert('Could not connect to backend. Make sure the server is running.')
    } finally {
      setScanning(false)
    }
  }

  const downloadReport = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/scan/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SAST',
          target: files[0]?.name || 'scan',
          total: results.length,
          critical: results.filter(v => v.severity === 'high').length,
          high: results.filter(v => v.severity === 'high').length,
          medium: results.filter(v => v.severity === 'medium').length,
          low: results.filter(v => v.severity === 'low').length,
          vulnerabilities: results
        })
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'securescan-report.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Could not generate report. Make sure the server is running.')
    }
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
              <button className="btn btn-primary btn-sm" onClick={downloadReport}>Export Report</button>
            </div>
          </div>

          <div className="vuln-list-wrap">
            {filtered.map((v, i) => (
              <div key={i} className="vuln-item card">
                <div className="vuln-summary" onClick={() => setExpanded(expanded === i ? null : i)}>
                  <span className={`badge ${sevColors[v.severity]}`}>{v.severity}</span>
                  <span className="vuln-type">{v.type}</span>
                  <span className="vuln-file">{v.file}<span className="vuln-line">{v.line ? `:${v.line}` : ''}</span></span>
                  <span className="vuln-toggle">
                    {expanded === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>
                {expanded === i && (
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