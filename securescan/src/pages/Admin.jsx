import { useState, useEffect } from 'react'
import { Users, ShieldAlert, BarChart3, Trash2, RefreshCw, Search } from 'lucide-react'
import '../components/Layout.css'
import './Admin.css'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [scans, setScans] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const token = localStorage.getItem('token')
  const headers = { 'Authorization': `Bearer ${token}` }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, scansRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/admin/stats', { headers }),
        fetch('http://127.0.0.1:8000/api/admin/users', { headers }),
        fetch('http://127.0.0.1:8000/api/admin/scans', { headers }),
      ])
      setStats(await statsRes.json())
      setUsers(await usersRes.json())
      setScans(await scansRes.json())
    } catch (err) {
      console.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const updateUser = async (userId, data) => {
    await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    fetchAll()
  }

  const deleteUser = async (userId) => {
    if (!confirm('Delete this user and all their scans?')) return
    await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers
    })
    fetchAll()
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="page-header">
      <p className="page-subtitle">Loading admin data...</p>
    </div>
  )

  return (
    <div className="admin-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage users, monitor scans and platform activity</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'users', label: `Users (${users.length})`, icon: Users },
          { key: 'scans', label: `Scans (${scans.length})`, icon: ShieldAlert },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`admin-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && stats && (
        <div className="admin-overview">
          <div className="admin-stats">
            {[
              { label: 'Total Users', value: stats.total_users, color: 'blue' },
              { label: 'Total Scans', value: stats.total_scans, color: 'purple' },
              { label: 'Vulnerabilities Found', value: stats.total_vulnerabilities, color: 'red' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`admin-stat-card admin-stat--${color}`}>
                <div className="admin-stat-value">{value}</div>
                <div className="admin-stat-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Top Vulnerability Types</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="scan-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vulnerability Type</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_vulnerability_types.map((v, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text3)', width: 40 }}>{i + 1}</td>
                      <td>{v.type}</td>
                      <td><span className="badge badge-info">{v.count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          {/* Search */}
          <div className="admin-search">
            <Search size={15} />
            <input
              className="input"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="scan-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Scans</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 500 }}>{user.name}</td>
                      <td style={{ color: 'var(--text3)', fontSize: 13 }}>{user.email}</td>
                      <td>
                        <span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-low'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.status === 'banned' ? 'badge-critical' : 'badge-low'}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td><span className="badge badge-info">{user.scan_count}</span></td>
                      <td style={{ color: 'var(--text3)', fontSize: 13 }}>{user.created_at}</td>
                      <td>
                        {user.email !== 'rouagharib631@gmail.com' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => updateUser(user.id, {
                                status: user.status === 'banned' ? 'active' : 'banned'
                              })}
                            >
                              {user.status === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => updateUser(user.id, {
                                    role: user.role === 'admin' ? 'user' : 'admin'
                                })}
                            >
                                {user.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid #fecaca' }}
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scans Tab */}
      {tab === 'scans' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Scan ID</th>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Critical</th>
                  <th>High</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => (
                  <tr key={scan.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                      {scan.id.slice(-8)}
                    </td>
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
                    <td><span className="badge badge-info">{scan.total}</span></td>
                    <td className="scan-time">{scan.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}