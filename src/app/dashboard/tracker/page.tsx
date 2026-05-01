'use client'
// src/app/dashboard/tracker/page.tsx
// NOTE: For simplicity this is a client component that fetches its own data.
// In production you can split into server/client like the listings page.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Application, AppStatus } from '@/types/database'

const STATUSES: AppStatus[] = ['Saved', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected', 'Withdrawn']

const STATUS_CLASS: Record<AppStatus, string> = {
  'Saved':       'status-saved',
  'Applied':     'status-applied',
  'Phone Screen':'status-phone',
  'Interview':   'status-interview',
  'Offer':       'status-offer',
  'Rejected':    'status-rejected',
  'Withdrawn':   'status-withdrawn',
}

export default function TrackerPage() {
  const [apps, setApps] = useState<(Application & { listing?: any })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customOrg, setCustomOrg] = useState('')
  const supabase = createClient()

  useEffect(() => { fetchApps() }, [])

  async function fetchApps() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('applications')
      .select('*, listing:listings(title, organization, org_type, deadline)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setApps(data ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: AppStatus) {
    await supabase.from('applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function updateNotes(id: string, notes: string) {
    await supabase.from('applications').update({ notes }).eq('id', id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, notes } : a))
  }

  async function removeApp(id: string) {
    await supabase.from('applications').delete().eq('id', id)
    setApps(prev => prev.filter(a => a.id !== id))
  }

  async function addCustomApp() {
    if (!customTitle || !customOrg) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('applications').insert({
      user_id: user.id, custom_title: customTitle, custom_org: customOrg, status: 'Applied',
    }).select().single()
    if (data) setApps(prev => [data, ...prev])
    setCustomTitle(''); setCustomOrg(''); setShowAddForm(false)
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s).length
    return acc
  }, {} as Record<AppStatus, number>)

  if (loading) return (
    <div style={{ padding:'40px 28px', color:'var(--muted)' }}>Loading applications...</div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', padding:'16px 28px', borderBottom:'1px solid var(--border)', gap:'16px', background:'var(--bg)', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'20px', flex:1 }}>My Applications</div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>+ Track External App</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
        {/* Status summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'8px', marginBottom:'24px' }}>
          {STATUSES.map(s => (
            <div key={s} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'10px', padding:'12px 14px' }}>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:'24px', color:'var(--text)' }}>{counts[s]}</div>
              <div style={{ fontSize:'10px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.7px', marginTop:'2px' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Add custom app form */}
        {showAddForm && (
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'18px 20px', marginBottom:'18px' }}>
            <div style={{ fontSize:'13px', fontWeight:'500', marginBottom:'12px', color:'var(--text)' }}>Track an External Application</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div>
                <label className="form-label">Position Title</label>
                <input className="form-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="e.g. Legal Intern" />
              </div>
              <div>
                <label className="form-label">Organization</label>
                <input className="form-input" value={customOrg} onChange={e => setCustomOrg(e.target.value)} placeholder="e.g. ACLU" />
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addCustomApp}>Add</button>
            </div>
          </div>
        )}

        {/* Table */}
        {apps.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>▣</div>
            <div>No tracked applications yet. Click "Track Application" on any listing, or add an external app above.</div>
          </div>
        ) : (
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Position', 'Organization', 'Status', 'Deadline', 'Notes', ''].map(h => (
                    <th key={h} style={{ textAlign:'left', fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.8px', padding:'12px 16px', fontWeight:'500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map(app => {
                  const title = app.custom_title || app.listing?.title || 'Untitled'
                  const org = app.custom_org || app.listing?.organization || 'Unknown'
                  const deadline = app.deadline || app.listing?.deadline
                  return (
                    <tr key={app.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 16px', fontSize:'13px', fontWeight:'500' }}>{title}</td>
                      <td style={{ padding:'12px 16px', fontSize:'13px', color:'var(--muted)' }}>{org}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <select
                          value={app.status}
                          onChange={e => updateStatus(app.id, e.target.value as AppStatus)}
                          className={`status-pill ${STATUS_CLASS[app.status]}`}
                          style={{ background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', outline:'none', fontSize:'11px', fontWeight:'500', padding:'3px 10px' }}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'12px', color:'var(--muted)' }}>{deadline || '—'}</td>
                      <td style={{ padding:'12px 16px', maxWidth:'200px' }}>
                        <input
                          defaultValue={app.notes || ''}
                          onBlur={e => updateNotes(app.id, e.target.value)}
                          placeholder="Add notes..."
                          style={{ background:'transparent', border:'none', outline:'none', color:'var(--muted)', fontSize:'12px', width:'100%', fontFamily:'inherit' }}
                        />
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <button onClick={() => removeApp(app.id)} className="btn btn-danger" style={{ padding:'4px 10px', fontSize:'11px' }}>Remove</button>
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
