'use client'
// src/app/dashboard/listings/ListingsClient.tsx
// Updated with category filter pills (Legal / Government / Finance / etc.)

import { useState, useMemo, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'

const CATEGORY_COLORS: Record<string, string> = {
  'Legal':       'rgba(45,95,179,0.20)',
  'Government':  'rgba(106,171,222,0.18)',
  'Policy':      'rgba(74,125,212,0.18)',
  'Finance':     'rgba(82,196,127,0.15)',
  'Consulting':  'rgba(224,144,82,0.15)',
  'Tech-Policy': 'rgba(150,120,200,0.18)',
  'International': 'rgba(106,171,222,0.18)',
  'Compliance':  'rgba(200,200,82,0.15)',
  'Research':    'rgba(180,140,200,0.15)',
  'Advocacy':    'rgba(224,82,82,0.15)',
  'Other':       'rgba(255,255,255,0.08)',
}

const CATEGORY_TEXT: Record<string, string> = {
  'Legal': '#6b9ae8', 'Government': '#6aabde', 'Policy': '#4a7dd4',
  'Finance': '#52c47f', 'Consulting': '#e09052', 'Tech-Policy': '#a890e0',
  'International': '#6aabde', 'Compliance': '#c8c452', 'Research': '#c490d0',
  'Advocacy': '#e08080', 'Other': '#8a93a8',
}

const PAY_CLASS: Record<string, string> = {
  'Paid': 'tag-paid', 'Stipend': 'tag-stipend', 'Unpaid': 'tag-unpaid',
}

interface Props {
  listings: any[]
  savedIds: string[]
  userId: string
  stats: { total: number; newThisWeek: number; paid: number; remote: number }
  byCategory: Record<string, number>
  initialFilters: any
}

export default function ListingsClient({ listings, savedIds: initialSaved, userId, stats, byCategory }: Props) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [payFilter, setPayFilter] = useState<string>('All')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSaved))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const supabase = createClient()

  const filtered = useMemo(() => {
    return listings.filter((l: any) => {
      const q = search.toLowerCase()
      const matchQ = !q ||
        l.title.toLowerCase().includes(q) ||
        l.organization.toLowerCase().includes(q) ||
        (l.practice_area?.toLowerCase().includes(q) ?? false) ||
        l.location.toLowerCase().includes(q)
      const matchCat = categoryFilter === 'All' || (l.category || 'Legal') === categoryFilter
      const matchPay = payFilter === 'All' || l.pay_type === payFilter
      const matchRemote = !remoteOnly || l.remote
      return matchQ && matchCat && matchPay && matchRemote
    })
  }, [listings, search, categoryFilter, payFilter, remoteOnly])

  const selected = selectedId ? listings.find((l: any) => l.id === selectedId) : null

  async function toggleSave(listingId: string) {
    const isSaved = savedIds.has(listingId)
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (isSaved) next.delete(listingId)
      else next.add(listingId)
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

  async function trackApplication(listing: any) {
    await supabase.from('applications').upsert({
      user_id: userId, listing_id: listing.id, status: 'Saved', deadline: listing.deadline,
    }, { onConflict: 'user_id,listing_id' })
    setSelectedId(null)
    window.location.href = '/dashboard/tracker'
  }

  function daysLeft(deadline: string | null): number | null {
    if (!deadline) return null
    return differenceInDays(new Date(deadline), new Date())
  }

  // Build category list dynamically based on what's actually in the data
  const allCategories = ['All', ...Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a])]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)', gap: '16px', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', flex: 1 }}>All Listings</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', flex: 1, maxWidth: '360px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>⌕</span>
          <input
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '13px', padding: '9px 0', width: '100%', fontFamily: 'inherit' }}
            placeholder="Search roles, orgs, areas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <a href="/dashboard/submit" className="btn btn-primary">+ Add Listing</a>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>◈</div>
              <div style={{ fontSize: '15px', marginBottom: '8px' }}>No listings yet</div>
              <div style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 20px' }}>
                The scraper hasn't run yet, or there are no active listings. Trigger the scraper from the Actions tab on GitHub, or add a listing manually.
              </div>
              <a href="/dashboard/submit" className="btn btn-primary" style={{ display: 'inline-block' }}>+ Add a listing manually</a>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--text)' }}>{stats.total}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>Total Listings</div>
                  <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '4px' }}>+{stats.newThisWeek} this week</div>
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--text)' }}>{stats.newThisWeek}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>New This Week</div>
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--text)' }}>{stats.paid}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>Paid / Stipend</div>
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--text)' }}>{stats.remote}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>Remote Options</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {allCategories.map((cat) => {
                  const count = cat === 'All' ? stats.total : (byCategory[cat] ?? 0)
                  const active = categoryFilter === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        background: active ? (CATEGORY_COLORS[cat] ?? 'var(--accent)') : 'transparent',
                        color: active ? (CATEGORY_TEXT[cat] ?? '#1a1200') : 'var(--muted)',
                        fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                        fontWeight: active ? 500 : 400, transition: 'all 0.1s', whiteSpace: 'nowrap',
                      }}
                    >
                      {cat} <span style={{ opacity: 0.6, marginLeft: '4px' }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['All', 'Paid', 'Stipend', 'Unpaid'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPayFilter(p)}
                    style={{
                      padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border)',
                      background: payFilter === p ? 'rgba(45,95,179,0.18)' : 'transparent',
                      color: payFilter === p ? 'var(--accent3)' : 'var(--muted)',
                      fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}
                  >{p}</button>
                ))}
                <button
                  onClick={() => setRemoteOnly(!remoteOnly)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border)',
                    background: remoteOnly ? 'rgba(82,196,127,0.12)' : 'transparent',
                    color: remoteOnly ? 'var(--green)' : 'var(--muted)',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Remote Only</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>No listings match your filters.</div>
                ) : filtered.map((l: any) => {
                  const dl = daysLeft(l.deadline)
                  const saved = savedIds.has(l.id)
                  const isNew = differenceInDays(new Date(), new Date(l.created_at)) < 7
                  const cat = l.category || 'Legal'
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      style={{
                        background: 'var(--bg2)',
                        border: `1px solid ${saved ? 'rgba(45,95,179,0.4)' : 'var(--border)'}`,
                        borderRadius: '12px', padding: '18px 20px', cursor: 'pointer', display: 'flex',
                        alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s',
                        borderLeft: saved ? '2px solid var(--accent2)' : undefined,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{l.title}</span>
                          {isNew && <span className="tag tag-new" style={{ fontSize: '10px' }}>New</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                          {l.organization} · {l.location}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
                            background: CATEGORY_COLORS[cat] ?? 'rgba(45,95,179,0.20)',
                            color: CATEGORY_TEXT[cat] ?? '#6b9ae8',
                          }}>{cat}</span>
                          <span className={`tag ${PAY_CLASS[l.pay_type]}`}>{l.pay_type}</span>
                          {l.practice_area && (
                            <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>{l.practice_area}</span>
                          )}
                          {l.remote && <span className="tag" style={{ background: 'rgba(82,196,127,0.1)', color: 'var(--green)' }}>Remote</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                          {dl !== null && (
                            <span style={{ fontSize: '11px', color: dl < 21 ? 'var(--amber)' : 'var(--muted)' }}>
                              ⏱ {dl < 0 ? 'Closed' : dl === 0 ? 'Due today' : `${dl}d left`}
                            </span>
                          )}
                          {l.rolling && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>⏱ Rolling</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSave(l.id)}
                          style={{
                            border: `1px solid ${saved ? 'var(--accent2)' : 'var(--border)'}`,
                            borderRadius: '6px',
                            color: saved ? 'var(--accent3)' : 'var(--muted)',
                            padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                            background: saved ? 'rgba(45,95,179,0.10)' : 'transparent',
                          }}
                        >{saved ? '✦ Saved' : '✧ Save'}</button>
                        <a
                          href={l.apply_url} target="_blank" rel="noopener noreferrer"
                          style={{
                            background: 'rgba(45,95,179,0.12)', border: '1px solid rgba(45,95,179,0.3)',
                            borderRadius: '6px', color: 'var(--accent3)', padding: '5px 10px',
                            fontSize: '11px', textDecoration: 'none', textAlign: 'center', display: 'block',
                          }}
                        >Apply ↗</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {selected && (
          <>
            <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
            <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '460px', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', zIndex: 101, overflowY: 'auto', padding: '28px' }}>
              <button onClick={() => setSelectedId(null)} style={{ float: 'right', background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              <div style={{ clear: 'both', paddingTop: '8px' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--text)', marginBottom: '4px' }}>{selected.title}</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>{selected.organization}</div>
              {selected.description && (
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.7', marginBottom: '20px' }}>{selected.description}</div>
              )}
              <a href={selected.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>Apply Now ↗</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
