'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminListingsPage() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unverified' | 'inactive'>('all')
  const supabase = createClient()

  useEffect(() => { fetchListings() }, [])

  async function fetchListings() {
    const { data } = await supabase.from('listings').select('*').order('created_at', { ascending: false })
    setListings(data ?? [])
    setLoading(false)
  }

  async function toggleVerified(id: string, current: boolean) {
    await supabase.from('listings').update({ verified: !current }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, verified: !current } : l))
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('listings').update({ active: !current }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, active: !current } : l))
  }

  async function deleteListing(id: string) {
    if (!confirm('Permanently delete this listing?')) return
    await supabase.from('listings').delete().eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
  }

  const filtered = listings.filter(l => {
    if (filter === 'unverified') return !l.verified
    if (filter === 'inactive') return !l.active
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', flex: 1 }}>Manage Listings</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'unverified', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border)',
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? '#1a1200' : 'var(--muted)',
                fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >{f}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Loading...</div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Title', 'Org', 'Type', 'Source', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 16px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', maxWidth: '280px' }}>{l.title}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)' }}>{l.organization}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--muted)' }}>{l.org_type}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`tag ${l.source === 'scraped' ? 'tag-policy' : l.source === 'admin' ? 'tag-paid' : 'tag-gov'}`}>{l.source}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {l.verified && <span className="tag tag-paid">✓ Verified</span>}
                        {!l.active && <span className="tag tag-unpaid">Inactive</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => toggleVerified(l.id, l.verified)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
                          {l.verified ? 'Unverify' : 'Verify'}
                        </button>
                        <button onClick={() => toggleActive(l.id, l.active)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
                          {l.active ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={() => deleteListing(l.id)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
