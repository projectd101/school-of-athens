import { useEffect, useState } from 'react'
import { supabase, type Hotspot } from '../lib/supabase'

const SESSION_KEY = 'admin_authed'

export default function Admin() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  )
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setCheckingAuth(true)
    const { data, error } = await supabase
      .from('admin_config')
      .select('password')
      .eq('id', 1)
      .single()
    setCheckingAuth(false)
    if (error || !data) {
      setAuthError('Could not verify password. Try again.')
      return
    }
    if (passwordInput === data.password) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthed(true)
    } else {
      setAuthError('Incorrect password.')
    }
  }

  if (!authed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080808',
          color: '#eee',
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            width: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '24px',
              fontWeight: 500,
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Admin access
          </h1>
          <input
            type="password"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              color: '#eee',
              padding: '10px 12px',
              fontSize: '14px',
            }}
          />
          {authError && (
            <p style={{ color: '#e28080', fontSize: '13px', margin: 0 }}>
              {authError}
            </p>
          )}
          <button
            type="submit"
            disabled={checkingAuth}
            style={{ ...btnStyle, padding: '10px 14px' }}
          >
            {checkingAuth ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    )
  }

  return <AdminPanel onLogout={() => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
  }} />
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<Hotspot[]>([])
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('hotspots')
      .select('*')
      .order('id', { ascending: true })
    if (!error && data) {
      setRows(data as Hotspot[])
      const d: Record<number, string> = {}
      for (const row of data as Hotspot[]) d[row.id] = row.video_id ?? ''
      setDrafts(d)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async (id: number) => {
    setSavingId(id)
    const value = drafts[id] ?? ''
    const { error } = await supabase
      .from('hotspots')
      .update({ video_id: value, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error(error)
      alert('Failed to save: ' + error.message)
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, video_id: value } : r))
      )
    }
    setSavingId(null)
  }

  const handleClear = async (id: number) => {
    setDrafts((prev) => ({ ...prev, [id]: '' }))
    setSavingId(id)
    const { error } = await supabase
      .from('hotspots')
      .update({ video_id: '', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, video_id: '' } : r))
      )
    }
    setSavingId(null)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg('')

    if (newPassword.length < 4) {
      setPasswordMsg('New password must be at least 4 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New password and confirmation do not match.')
      return
    }

    setChangingPassword(true)
    const { data: current, error: fetchError } = await supabase
      .from('admin_config')
      .select('password')
      .eq('id', 1)
      .single()

    if (fetchError || !current) {
      setChangingPassword(false)
      setPasswordMsg('Could not verify current password.')
      return
    }
    if (current.password !== currentPassword) {
      setChangingPassword(false)
      setPasswordMsg('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase
      .from('admin_config')
      .update({ password: newPassword, updated_at: new Date().toISOString() })
      .eq('id', 1)

    setChangingPassword(false)
    if (updateError) {
      setPasswordMsg('Failed to update password: ' + updateError.message)
      return
    }

    setPasswordMsg('Password updated.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#eee',
        fontFamily: 'Inter, sans-serif',
        padding: '48px 5vw 80px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '32px',
              fontWeight: 500,
              margin: 0,
            }}
          >
            Hotspots
          </h1>
          <p style={{ color: '#999', marginTop: '8px', fontSize: '14px' }}>
            Paste a YouTube video ID or full link for each tablet. Leave empty
            to disable that tablet.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setShowPasswordForm((v) => !v)
              setPasswordMsg('')
            }}
            style={btnStyle}
          >
            {showPasswordForm ? 'Close' : 'Change password'}
          </button>
          <button onClick={onLogout} style={btnStyle}>
            Log out
          </button>
        </div>
      </div>

      {showPasswordForm && (
        <form
          onSubmit={handleChangePassword}
          style={{
            marginTop: '24px',
            padding: '20px',
            background: '#111',
            border: '1px solid #222',
            maxWidth: '360px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
          />
          {passwordMsg && (
            <p
              style={{
                fontSize: '13px',
                margin: 0,
                color: passwordMsg === 'Password updated.' ? '#8ae2a0' : '#e28080',
              }}
            >
              {passwordMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={changingPassword}
            style={{ ...btnStyle, alignSelf: 'flex-start' }}
          >
            {changingPassword ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ marginTop: '32px', color: '#777' }}>Loading…</p>
      ) : (
        <table
          style={{
            width: '100%',
            marginTop: '32px',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: '#888' }}>
              <th style={th}>ID</th>
              <th style={th}>Label</th>
              <th style={th}>YouTube ID or link</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{row.id}</td>
                <td style={td}>{row.label}</td>
                <td style={td}>
                  <input
                    value={drafts[row.id] ?? ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    placeholder="e.g. dQw4w9WgXcQ or full URL"
                    style={{
                      width: '100%',
                      background: '#141414',
                      border: '1px solid #2a2a2a',
                      color: '#eee',
                      padding: '8px 10px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => handleSave(row.id)}
                    disabled={savingId === row.id}
                    style={btnStyle}
                  >
                    {savingId === row.id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleClear(row.id)}
                    disabled={savingId === row.id}
                    style={{ ...btnStyle, marginLeft: '8px', color: '#e28080' }}
                  >
                    Clear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '8px 10px',
  fontWeight: 500,
  fontSize: '12px',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

const td: React.CSSProperties = {
  padding: '10px',
  verticalAlign: 'middle',
}

const inputStyle: React.CSSProperties = {
  background: '#141414',
  border: '1px solid #2a2a2a',
  color: '#eee',
  padding: '9px 12px',
  fontSize: '13px',
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #333',
  color: '#ddd',
  padding: '7px 14px',
  fontSize: '13px',
  cursor: 'pointer',
}