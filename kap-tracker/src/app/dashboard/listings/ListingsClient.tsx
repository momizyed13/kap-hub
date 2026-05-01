'use client'
// src/app/dashboard/listings/ListingsClient.tsx
import { useState, useMemo, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'
import type { Listing, OrgType, PayType } from '@/types/database'

const ORG_TYPES: OrgType[] = ['Government', 'Nonprofit / NGO', 'Law Firm', 'Policy', 'Research', 'Advocacy', 'Judicial']
const PAY_TYPES: PayType[] = ['Paid', 'Stipend', 'Unpaid']

const ORG_EMOJI: Record<string, string> = {
  'Government': '🏛️', 'Nonprofit / NGO': '⚖️', 'Law Firm': '🏢',
  'Policy': '🗳️', 'Research': '📚', 'Advocacy': '✊', 'Judicial': '🔏', 'Other': '📋'
}

const TAG_CLASS: Record<string, string> = {
  'Law Firm': 'tag-law', 'Government': 'tag-gov', 'Nonprofit / NGO': 'tag-ngo',
  'Policy': 'tag-policy', 'Research': 'tag-policy', 'Advocacy': 'tag-ngo',
  'Judicial': 'tag-gov', 'Other': 'tag-gov'
}

const PAY_CLASS: Record<string, string> = {
  'Paid': 'tag-paid', 'Stipend': 'tag-stipend', 'Unpaid': 'tag-unpaid'
}

interface Props {
  listings: Listing[]
  savedIds: string[]
  userId: string
  stats: { total: number; newThisWeek: number; paid: number; remote: number }
  initialFilters: { q?: string; type?: string; pay?: string; remote?: string }
}

export default function ListingsClient({ listings, savedIds: initialSaved, userId, stats }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [payFilter, setPayFilter] = useState<string>('All')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set(initialSaved))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const supabase = createClient()

  const filtered = useMemo(() => {
    return listings.filter(l => {
      const q = search.toLowerCase()
      const matchQ = !q || l.title.toLowerCase().includes(q) || l.organization.toLowerCase().includes(q)
        || (l.practice_area?.toLowerCase().includes(q)) || l.location.toLowerCase().includes(q)
      const matchType = typeFilter === 'All' || l.org_type === typeFilter
      const matchPay = payFilter === 'All' || l.pay_type === payFilter
      const matchRemote = !remoteOnly || l.remote
      return matchQ && matchType && matchPay && matchRemote
    })
  }, [listings, search, typeFilter, payFilter, remoteOnly])

  const selected = selectedId ? listings.find(l => l.id === selectedId) : null

  async function toggleSave(listingId: string) {
    const isSaved = savedIds.has(listingId)
    setSavedIds(prev => {
      const next = new Set(prev)
      isSaved ? next.delete(listingId) : next.add(listingId)
      return next
    })
    startTransition(async () => {
      if (isSaved) {
        await supabase.from('saved_listings').delete().match({ user_id: userId, listing_id: listingId })
      } else {
        await supabase.from('saved_listings').insert({ user_id: userId, listing_id: listingId })
      }
    })
  }

  async function trackApplication(listing: Listing) {
    await supabase.from('applications').upsert({
      user_id: userId,
      listing_id: listing.id,
      status: 'Saved',
      deadline: listing.deadline,
    }, { onConflict: 'user_id,listing_id' })
    setSelectedId(null)
    window.location.href = '/dashboard/tracker'
  }

  function daysLeft(deadline: string | null): number | null {
    if (!deadline) return null
    return differenceInDays(new Date(deadline), new Date())
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      {/* Top bar */}
      <div style={{
        display:'flex', alignItems:'center', padding:'16px 28px',
        borderBottom:'1px solid var(--border)', gap:'16px', background:'var(--bg)', flexShrink:0
      }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'20px', flex:1 }}>All Listings</div>
        <div style={{
          display:'flex', alignItems:'center', gap:'8px', background:'var(--bg2)',
          border:'1px solid var(--border)', borderRadius:'8px', padding:'0 12px', flex:1, maxWidth:'360px'
        }}>
          <span style={{ color:'var(--muted)', fontSize:'14px' }}>⌕</span>
          <input
            style={{ background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:'13px', padding:'9px 0', width:'100%', fontFamily:'inherit' }}
            placeholder="Search roles, orgs, areas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <a href="/dashboard/submit" className="btn btn-primary">+ Add Listing</a>
      </div>

      <div style={{ flex:1, overflow:'hidden', display:'flex' }}>
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
            {[
              { val: stats.total, label: 'Total Listings', delta: `+${stats.newThisWeek} this week` },
              { val: stats.newThisWeek, label: 'New This Week' },
              { val: stats.paid, label: 'Paid / Stipend' },
              { val: stats.remote, label: 'Remote Options' },
            ].map((s, i) => (
              <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px 18px' }}>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'28px', color:'var(--text)' }}>{s.val}</div>
                <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginTop:'2px' }}>{s.label}</div>
                {s.delta && <div style={{ fontSize:'11px', color:'var(--green)', marginTop:'4px' }}>{s.delta}</div>}
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'18px', flexWrap:'wrap', alignItems:'center' }}>
            {['All', ...ORG_TYPES].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding:'5px 12px', borderRadius:'20px', border:'1px solid var(--border)',
                background: typeFilter === t ? 'var(--accent)' : 'transparent',
                color: typeFilter === t ? '#1a1200' : 'var(--muted)',
                fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight: typeFilter===t ? '500' : '400',
                transition:'all 0.15s', whiteSpace:'nowrap',
              }}>{t}</button>
            ))}
            <div style={{ width:'1px', height:'20px', background:'var(--border)', margin:'0 4px' }} />
            {['All', ...PAY_TYPES].map(p => (
              <button key={p} onClick={() => setPayFilter(p)} style={{
                padding:'5px 12px', borderRadius:'20px', border:'1px solid var(--border)',
                background: payFilter === p ? 'rgba(200,169,110,0.18)' : 'transparent',
                color: payFilter === p ? 'var(--accent)' : 'var(--muted)',
                fontSize:'12px', cursor:'pointer', fontFamily:'inherit',
                transition:'all 0.15s', whiteSpace:'nowrap',
              }}>{p}</button>
            ))}
            <button onClick={() => setRemoteOnly(!remoteOnly)} style={{
              padding:'5px 12px', borderRadius:'20px', border:'1px solid var(--border)',
              background: remoteOnly ? 'rgba(82,196,127,0.12)' : 'transparent',
              color: remoteOnly ? 'var(--green)' : 'var(--muted)',
              fontSize:'12px', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
            }}>Remote Only</button>
          </div>

          {/* Listings */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>◈</div>
                <div>No listings match your filters.</div>
              </div>
            ) : filtered.map(l => {
              const dl = daysLeft(l.deadline)
              const saved = savedIds.has(l.id)
              const isNew = differenceInDays(new Date(), new Date(l.created_at)) < 7
              return (
                <div
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  style={{
                    background:'var(--bg2)', border:`1px solid ${saved ? 'rgba(200,169,110,0.3)' : 'var(--border)'}`,
                    borderRadius:'12px', padding:'18px 20px', cursor:'pointer', display:'flex',
                    alignItems:'flex-start', gap:'16px', transition:'all 0.18s',
                    borderLeft: saved ? '2px solid var(--accent)' : undefined,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
                >
                  <div style={{
                    width:'40px', height:'40px', borderRadius:'8px', background:'var(--bg3)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px',
                    flexShrink:0, border:'1px solid var(--border)',
                  }}>{ORG_EMOJI[l.org_type] ?? '📋'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'6px' }}>
                      <div>
                        <span style={{ fontSize:'14px', fontWeight:'500', color:'var(--text)' }}>{l.title}</span>
                        {isNew && <span className="tag tag-new" style={{ marginLeft:'8px', fontSize:'10px' }}>New</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:'12px', color:'var(--muted)', marginBottom:'8px' }}>
                      {l.organization} · {l.location}
                    </div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      <span className={`tag ${TAG_CLASS[l.org_type] ?? 'tag-gov'}`}>{l.org_type}</span>
                      <span className={`tag ${PAY_CLASS[l.pay_type]}`}>{l.pay_type}</span>
                      {l.practice_area && (
                        <span className="tag" style={{ background:'rgba(255,255,255,0.05)', color:'var(--muted)' }}>
                          {l.practice_area}
                        </span>
                      )}
                      {l.remote && <span className="tag" style={{ background:'rgba(82,196,127,0.1)', color:'var(--green)' }}>Remote</span>}
                    </div>
                    <div style={{ display:'flex', gap:'16px', marginTop:'10px' }}>
                      {dl !== null && (
                        <span style={{ fontSize:'11px', color: dl < 21 ? 'var(--amber)' : 'var(--muted)' }}>
                          ⏱ {dl < 0 ? 'Closed' : dl === 0 ? 'Due today' : `${dl}d left`}
                        </span>
                      )}
                      {l.rolling && <span style={{ fontSize:'11px', color:'var(--muted)' }}>⏱ Rolling</span>}
                      <span style={{ fontSize:'11px', color:'var(--muted)' }}>📍 {l.location}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', flexShrink:0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleSave(l.id)}
                      style={{
                        background:'transparent', border:`1px solid ${saved ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius:'6px', color: saved ? 'var(--accent)' : 'var(--muted)',
                        padding:'5px 10px', fontSize:'11px', cursor:'pointer', fontFamily:'inherit',
                        background: saved ? 'rgba(200,169,110,0.08)' : 'transparent',
                      }}
                    >{saved ? '✦ Saved' : '✧ Save'}</button>
                    <a
                      href={l.apply_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.25)',
                        borderRadius:'6px', color:'var(--accent)', padding:'5px 10px',
                        fontSize:'11px', textDecoration:'none', textAlign:'center', display:'block',
                      }}
                    >Apply ↗</a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <>
            <div
              onClick={() => setSelectedId(null)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100 }}
            />
            <div style={{
              position:'fixed', right:0, top:0, bottom:0, width:'460px',
              background:'var(--bg2)', borderLeft:'1px solid var(--border)',
              zIndex:101, overflowY:'auto', padding:'28px',
              animation:'slideIn 0.2s ease',
            }}>
              <style>{`@keyframes slideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }`}</style>
              <button
                onClick={() => setSelectedId(null)}
                style={{ float:'right', background:'transparent', border:'none', color:'var(--muted)', fontSize:'18px', cursor:'pointer', padding:0 }}
              >✕</button>
              <div style={{ clear:'both', paddingTop:'8px' }} />
              <div style={{
                width:'52px', height:'52px', borderRadius:'10px', background:'var(--bg3)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px',
                border:'1px solid var(--border)', marginBottom:'14px',
              }}>{ORG_EMOJI[selected.org_type] ?? '📋'}</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:'22px', color:'var(--text)', marginBottom:'4px' }}>{selected.title}</div>
              <div style={{ fontSize:'14px', color:'var(--muted)', marginBottom:'16px' }}>{selected.organization}</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'20px' }}>
                <span className={`tag ${TAG_CLASS[selected.org_type] ?? 'tag-gov'}`}>{selected.org_type}</span>
                <span className={`tag ${PAY_CLASS[selected.pay_type]}`}>{selected.pay_type}</span>
                {selected.remote && <span className="tag" style={{ background:'rgba(82,196,127,0.1)', color:'var(--green)' }}>Remote</span>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'20px' }}>
                {[
                  { label:'Location', val:`📍 ${selected.location}` },
                  { label:'Deadline', val: selected.rolling ? '⏱ Rolling' : selected.deadline ? `⏱ ${selected.deadline}` : 'Not specified' },
                  { label:'Practice Area', val: selected.practice_area || 'General' },
                  { label:'Compensation', val: selected.pay_type },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize:'10px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'5px' }}>{item.label}</div>
                    <div style={{ fontSize:'13px', color:'var(--text)' }}>{item.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ height:'1px', background:'var(--border)', margin:'18px 0' }} />
              {selected.description && (
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontSize:'10px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>About</div>
                  <div style={{ fontSize:'13px', color:'var(--text)', lineHeight:'1.7' }}>{selected.description}</div>
                </div>
              )}
              <div style={{ display:'flex', gap:'10px', marginBottom:'10px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex:1 }}
                  onClick={() => toggleSave(selected.id)}
                >{savedIds.has(selected.id) ? '✦ Saved' : '✧ Save'}</button>
                <button
                  className="btn btn-primary"
                  style={{ flex:1 }}
                  onClick={() => trackApplication(selected)}
                >Track Application</button>
              </div>
              <a href={selected.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width:'100%', textDecoration:'none' }}>
                Apply Now ↗
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
