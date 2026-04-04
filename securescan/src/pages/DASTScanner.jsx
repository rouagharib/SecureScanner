import { useState } from 'react'
import { Globe, Shield, Lock, Server, CheckCircle2, Loader2, ChevronDown, ChevronUp, Wifi } from 'lucide-react'
import '../components/Layout.css'
import './Scanner.css'

const sevColors = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }
const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 }

const testChecks = [
  { label: 'Crawling pages', icon: Globe },
  { label: 'Testing inputs', icon: Shield },
  { label: 'Auth checks', icon: Lock },
  { label: 'Server config', icon: Server },
]

export default function DASTScanner() {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [step, setStep] = useState(-1)
  const [results, setResults] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all')

  const startScan = async () => {
    if (!url) return
    setScanning(true)
    setResults(null)
    setStep(0)

    let s = 0
    const interval = setInterval(() => {
      s++
      setStep(s)
      if (s >= testChecks.length) clearInterval(interval)
    }, 2000)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/scan/dast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ url })
      
      })

      clearInterval(interval)
      setStep(testChecks.length)

      if (!response.ok) {
        const err = await response.json()
        alert(err.detail || 'Scan failed')
        setScanning(false)
        return
      }

      const data = await response.json()
      setResults(data.vulnerabilities)

    } catch (error) {
      clearInterval(interval)
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
          type: 'DAST',
          target: url,
          total: results.length,
          critical: results.filter(v => v.severity === 'critical').length,
          high: results.filter(v => v.severity === 'high').length,
          medium: results.filter(v => v.severity === 'medium').length,
          low: results.filter(v => v.severity === 'low').length,
          vulnerabilities: results
        })
      })

      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = 'securescan-report.pdf'
      link.click()
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
        <h1 className="page-title">URL Scanner</h1>
        <p className="page-subtitle">Dynamic Application Security Testing (DAST)</p>
      </div>

      <div className="card scan-setup">
        <div className="card-body">
          <div className="url-form">
            <div className="input-group">
              <label className="input-label">Target URL</label>
              <input
                className="input"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={scanning}
              />
            </div>
            <button className="btn btn-primary" disabled={!url || scanning} onClick={startScan}>
              <Wifi size={16} /> {scanning ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>

          {scanning && (
            <div className="test-grid">
              {testChecks.map(({ label, icon: Icon }, i) => {
                const state = i < step ? 'done' : i === step ? 'running' : 'pending'
                return (
                  <div key={label} className={`test-item ${state}`}>
                    {state === 'done'
                      ? <CheckCircle2 size={15} />
                      : state === 'running'
                        ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Icon size={15} />}
                    {label}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
              <button className="btn btn-secondary btn-sm" onClick={() => { setResults(null); setStep(-1) }}>New Scan</button>
              <button className="btn btn-primary btn-sm" onClick={downloadReport}>Export Report</button>
            </div>
          </div>

          <div className="vuln-list-wrap">
            {filtered.map((v, i) => (
              <div key={i} className="vuln-item card">
                <div className="vuln-summary" onClick={() => setExpanded(expanded === i ? null : i)}>
                  <span className={`badge ${sevColors[v.severity]}`}>{v.severity}</span>
                  <span className="vuln-type">{v.type}</span>
                  <span className="vuln-file">{v.endpoint}</span>
                  {v.confidence !== undefined && (
                    <span className={`ai-badge ai-badge--${v.ai_verdict?.toLowerCase()}`}>
                      AI {v.confidence}% · {v.ai_verdict}
                    </span>
                  )}
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
                      <code>{v.response}</code>
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