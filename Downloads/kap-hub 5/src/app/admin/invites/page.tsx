'use client'
// src/app/admin/invites/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Invite } from '@/types/database'

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { fetchInvites() }, [])

  async function fetchInvites() {
    const { data } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })
    setInvites(data ?? [])
  }

  async function sendInvite() {
    if (!email.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('invites')
      .insert({ email: email.trim().toLowerCase(), invited_by: user?.id })
      .select()
      .single()
    if (!error && data) {
      setInvites(prev => [data, ...prev])
      setEmail('')
    }
    setLoading(false)
  }

  function getInviteLink(token: string) {
    return `${window.location.origin}/auth/signup?token=${token}`
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getInviteLink(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  async function revokeInvite(id: string) {
    await supabase.from('invites').delete().eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', padding:'16px 28px', borderBottom:'1px solid var(--border)', background:'var(--bg)', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'20px', flex:1 }}>Manage Invites</div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
        {/* Send invite */}
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px', marginBottom:'24px' }}>
          <div style={{ fontSize:'13px', fontWeight:'500', color:'var(--text)', marginBottom:'12px' }}>Send New Invite</div>
          <div style={{ display:'flex', gap:'10px' }}>
            <input
              className="form-input"
              style={{ flex:1 }}
              type="email"
              placeholder="member@illinois.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
            />
            <button className="btn btn-primary" onClick={sendInvite} disabled={loading}>
              {loading ? 'Sending...' : 'Generate Invite Link'}
            </button>
          </div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'8px' }}>
            This generates a one-time invite link tied to the email. Link expires in 7 days.
          </div>
        </div>

        {/* Invite list */}
        {invites.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--muted)' }}>No invites sent yet.</div>
        ) : (
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Email', 'Status', 'Expires', 'Invite Link', ''].map(h => (
                    <th key={h} style={{ textAlign:'left', fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.8px', padding:'12px 16px', fontWeight:'500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invites.map(inv => {
                  const expired = new Date(inv.expires_at) < new Date()
                  return (
                    <tr key={inv.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 16px', fontSize:'13px' }}>{inv.email}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span className={`status-pill ${inv.used ? 'status-offer' : expired ? 'status-rejected' : 'status-applied'}`}
                          style={{ padding:'3px 10px', borderRadius:'10px', fontSize:'11px', fontWeight:'500', display:'inline-block' }}>
                          {inv.used ? 'Used' : expired ? 'Expired' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'12px', color:'var(--muted)' }}>
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding:'12px 16px', maxWidth:'280px' }}>
                        {!inv.used && !expired && (
                          <div style={{
                            background:'var(--bg3)', borderRadius:'6px', padding:'6px 10px',
                            fontSize:'11px', color:'var(--muted)', fontFamily:'monospace',
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                          }}>
                            {getInviteLink(inv.token)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:'8px' }}>
                          {!inv.used && !expired && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding:'4px 10px', fontSize:'11px' }}
                              onClick={() => copyLink(inv.token)}
                            >{copied === inv.token ? 'Copied!' : 'Copy Link'}</button>
                          )}
                          {!inv.used && (
                            <button
                              className="btn btn-danger"
                              style={{ padding:'4px 10px', fontSize:'11px' }}
                              onClick={() => revokeInvite(inv.id)}
                            >Revoke</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
