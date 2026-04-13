import { useState, useEffect } from 'react'
import { Users, ShieldAlert, BarChart3, Trash2, RefreshCw, Search, Ban, UserCheck, UserPlus, AlertTriangle } from 'lucide-react'
import { useToast } from '../components/Toast'
import '../components/Layout.css'
import './Admin.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Admin() {
  const { addToast } = useToast()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [scans, setScans] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // { type, userId, userName, action }

  const token = localStorage.getItem('token')
  const headers = { 'Authorization': `Bearer ${token}` }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, scansRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers }),
        fetch(`${API_URL}/api/admin/users?page=1&limit=100`, { headers }),
        fetch(`${API_URL}/api/admin/scans?page=1&limit=100`, { headers }),
      ])
      setStats(await statsRes.json())

      const usersData = await usersRes.json()
      setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []))

      const scansData = await scansRes.json()
      setScans(Array.isArray(scansData) ? scansData : (scansData.data || []))
    } catch {
      addToast('Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const updateUser = async (userId, data, userName) => {
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      addToast(`User ${userName} updated`, 'success')
      fetchAll()
    } catch {
      addToast('Failed to update user', 'error')
    }
  }

  const deleteUser = async (userId, userName) => {
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers
      })
      addToast(`User ${userName} deleted`, 'success')
      fetchAll()
    } catch {
      addToast('Failed to delete user', 'error')
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="admin-page">
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Confirm Action</h3>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.6, marginBottom: 24 }}>
              {confirmAction.type === 'delete'
                ? `Are you sure you want to delete "${confirmAction.userName}"? This will also remove all their scans. This action cannot be undone.`
                : `Are you sure you want to ${confirmAction.type === 'ban' ? 'ban' : confirmAction.type === 'unban' ? 'unban' : confirmAction.type === 'promote' ? 'promote' : 'demote'} "${confirmAction.userName}"?`
              }
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button className="btn btn-sm" style={{ background: confirmAction.type === 'delete' ? 'var(--danger)' : 'var(--accent)', color: 'white' }}
                onClick={() => {
                  if (confirmAction.type === 'delete') {
                    deleteUser(confirmAction.userId, confirmAction.userName)
                  } else if (confirmAction.type === 'ban') {
                    updateUser(confirmAction.userId, { status: 'banned' }, confirmAction.userName)
                  } else if (confirmAction.type === 'unban') {
                    updateUser(confirmAction.userId, { status: 'active' }, confirmAction.userName)
                  } else if (confirmAction.type === 'promote') {
                    updateUser(confirmAction.userId, { role: 'admin' }, confirmAction.userName)
                  } else if (confirmAction.type === 'demote') {
                    updateUser(confirmAction.userId, { role: 'user' }, confirmAction.userName)
                  }
                  setConfirmAction(null)
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage users, monitor scans and platform activity</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
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

      {/* Loading State */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 24, minHeight: 80, background: 'var(--bg2)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: 60, height: 24, background: 'var(--border)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
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
                      {stats.top_vulnerability_types.length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>No vulnerabilities found</td></tr>
                      ) : (
                        stats.top_vulnerability_types.map((v, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text3)', width: 40 }}>{i + 1}</td>
                            <td>{v.type}</td>
                            <td><span className="badge badge-info">{v.count}</span></td>
                          </tr>
                        ))
                      )}
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
                  {filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                      <Users size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <p>{search ? 'No users match your search' : 'No users found'}</p>
                    </div>
                  ) : (
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
                              <span className={`badge ${user.status === 'banned' ? 'badge-critical' : 'badge-success'}`}>
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
                                    title={user.status === 'banned' ? 'Unban user' : 'Ban user'}
                                    onClick={() => setConfirmAction({
                                      type: user.status === 'banned' ? 'unban' : 'ban',
                                      userId: user.id,
                                      userName: user.name
                                    })}
                                  >
                                    {user.status === 'banned' ? <UserCheck size={13} /> : <Ban size={13} />}
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                                    onClick={() => setConfirmAction({
                                      type: user.role === 'admin' ? 'demote' : 'promote',
                                      userId: user.id,
                                      userName: user.name
                                    })}
                                  >
                                    {user.role === 'admin' ? <Ban size={13} /> : <UserPlus size={13} />}
                                  </button>
                                  <button
                                    className="btn btn-sm"
                                    style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid #fecaca' }}
                                    title="Delete user"
                                    onClick={() => setConfirmAction({
                                      type: 'delete',
                                      userId: user.id,
                                      userName: user.name
                                    })}
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
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scans Tab */}
          {tab === 'scans' && (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                {scans.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                    <ShieldAlert size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <p>No scans found</p>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
