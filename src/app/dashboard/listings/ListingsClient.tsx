'use client'
// src/app/dashboard/listings/ListingsClient.tsx
// v4 - apply tracking, location filter, clickable tags, view tracking for recommendations

import { useState, useMemo, useTransition, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'

const CATEGORY_COLORS: Record<string, string> = {
  'Legal':         'rgba(45,95,179,0.20)',
  'Government':    'rgba(106,171,222,0.18)',
  'Policy':        'rgba(74,125,212,0.18)',
  'Finance':       'rgba(82,196,127,0.15)',
  'Consulting':    'rgba(224,144,82,0.15)',
  'Tech-Policy':   'rgba(150,120,200,0.18)',
  'International': 'rgba(106,171,222,0.18)',
  'Compliance':    'rgba(200,200,82,0.15)',
  'Research':      'rgba(180,140,200,0.15)',
  'Advocacy':      'rgba(224,82,82,0.15)',
  'Other':         'rgba(255,255,255,0.08)',
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
  appliedIds: string[]
  userId: string
  stats: { total: number; newThisWeek: number; paid: number; remote: number }
  byCategory: Record<string, number>
  initialFilters: any
}

// Apply prompt modal
function ApplyPrompt({
  listing,
  onApplied,
  onSkip,
  onClose,
}: {
  listing: any
  onApplied: () => void
  onSkip: () => void
  onClose: () => void
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '420px', zIndex: 201, textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>📋</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>
          Did you apply?
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.6' }}>
          Track your application to <strong style={{ color: 'var(--text)' }}>{listing.organization}</strong> in My Applications.
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onSkip}
            style={{
              flex: 1, padding: '10px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Not yet
          </button>
          <button
            onClick={onApplied}
            style={{
              flex: 1, padding: '10px',
              background: 'rgba(45,95,179,0.15)', border: '1px solid rgba(45,95,179,0.4)',
              borderRadius: '8px', color: 'var(--accent3)', fontSize: '13px',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            Yes, I applied ✓
          </button>
        </div>
      </div>
    </>
  )
}

// Detail panel
function DetailPanel({
  listing,
  saved,
  applied,
  onClose,
  onSave,
  onApplyClick,
}: {
  listing: any
  saved: boolean
  applied: boolean
  onClose: () => void
  onSave: () => void
  onApplyClick: () => void
}) {
  const dl = listing.deadline ? differenceInDays(new Date(listing.deadline), new Date()) : null
  const cat = listing.category || 'Legal'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '480px',
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 101, overflowY: 'auto', padding: '28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <button onClick={onSave} style={{
            background: saved ? 'rgba(45,95,179,0.10)' : 'transparent',
            border: `1px solid ${saved ? 'var(--accent2)' : 'var(--border)'}`,
            borderRadius: '6px', color: saved ? 'var(--accent3)' : 'var(--muted)',
            padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {saved ? '✦ Saved' : '✧ Save'}
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--text)', marginBottom: '4px', lineHeight: 1.3 }}>
          {listing.title}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '6px' }}>{listing.organization}</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>📍 {listing.location}</div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{
            padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
            background: CATEGORY_COLORS[cat] ?? 'rgba(45,95,179,0.20)',
            color: CATEGORY_TEXT[cat] ?? '#6b9ae8',
          }}>{cat}</span>
          <span className={`tag ${PAY_CLASS[listing.pay_type] ?? ''}`}>{listing.pay_type}</span>
          {listing.practice_area && (
            <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
              {listing.practice_area}
            </span>
          )}
          {listing.remote && <span className="tag" style={{ background: 'rgba(82,196,127,0.1)', color: 'var(--green)' }}>Remote</span>}
        </div>

        {dl !== null && (
          <div style={{
            padding: '10px 14px', background: dl < 14 ? 'rgba(224,144,82,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${dl < 14 ? 'rgba(224,144,82,0.25)' : 'var(--border)'}`,
            borderRadius: '8px', fontSize: '12px',
            color: dl < 14 ? 'var(--amber)' : 'var(--muted)', marginBottom: '16px',
          }}>
            ⏱ {dl < 0 ? 'Application closed' : dl === 0 ? 'Due today!' : `${dl} days left to apply`}
          </div>
        )}

        {listing.rolling && !dl && (
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>⏱ Rolling deadline</div>
        )}

        {listing.description && (
          <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.8', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
            {listing.description}
          </div>
        )}

        {applied ? (
          <div style={{
            padding: '12px', background: 'rgba(82,196,127,0.08)', border: '1px solid rgba(82,196,127,0.25)',
            borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: 'var(--green)', marginBottom: '12px',
          }}>
            ✓ You applied to this position
          </div>
        ) : null}

        <a
          href={listing.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onApplyClick}
          className="btn btn-primary"
          style={{ width: '100%', textDecoration: 'none', display: 'block', textAlign: 'center', marginBottom: '10px' }}
        >
          Apply Now ↗
        </a>

        {!applied && (
          <button
            onClick={onApplyClick}
            style={{
              width: '100%', padding: '9px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Mark as Applied
          </button>
        )}
      </div>
    </>
  )
}

export default function ListingsClient({
  listings,
  savedIds: initialSaved,
  appliedIds: initialApplied,
  userId,
  stats,
  byCategory,
}: Props) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [locationFilter, setLocationFilter] = useState<string>('All')
  const [practiceFilter, setPracticeFilter] = useState<string>('All')
  const [payFilter, setPayFilter] = useState<string>('All')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSaved))
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set(initialApplied))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [applyPromptId, setApplyPromptId] = useState<string | null>(null)
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const supabase = createClient()

  // Extract unique locations and practice areas for filter dropdowns
  const locations = useMemo(() => {
    const locs = new Set<string>()
    listings.forEach((l: any) => {
      if (l.location && l.location !== 'See posting' && l.location !== 'Various') {
        // Extract city/state from full address
        const parts = l.location.split(',')
        const city = parts[0]?.trim()
        if (city && city.length < 40) locs.add(city)
      }
    })
    return ['All', ...Array.from(locs).sort()]
  }, [listings])

  const practiceAreas = useMemo(() => {
    const areas = new Set<string>()
    listings.forEach((l: any) => { if (l.practice_area) areas.add(l.practice_area) })
    return ['All', ...Array.from(areas).sort()]
  }, [listings])

  // Track view for recommendations
  const trackView = useCallback(async (listingId: string) => {
    if (viewedIds.has(listingId)) return
    setViewedIds(prev => new Set(prev).add(listingId))
    startTransition(async () => {
      await supabase.from('listing_views').upsert({
        user_id: userId,
        listing_id: listingId,
        viewed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,listing_id' })
    })
  }, [viewedIds, userId, supabase])

  function openDetail(listingId: string) {
    setSelectedId(listingId)
    trackView(listingId)
  }

  const filtered = useMemo(() => {
    return listings.filter((l: any) => {
      const q = search.toLowerCase()
      const matchQ = !q ||
        l.title.toLowerCase().includes(q) ||
        l.organization.toLowerCase().includes(q) ||
        (l.practice_area?.toLowerCase().includes(q) ?? false) ||
        l.location.toLowerCase().includes(q) ||
        (l.category?.toLowerCase().includes(q) ?? false)
      const matchCat = categoryFilter === 'All' || (l.category || 'Legal') === categoryFilter
      const matchPay = payFilter === 'All' || l.pay_type === payFilter
      const matchRemote = !remoteOnly || l.remote
      const matchLoc = locationFilter === 'All' || l.location.includes(locationFilter)
      const matchPractice = practiceFilter === 'All' || l.practice_area === practiceFilter
      return matchQ && matchCat && matchPay && matchRemote && matchLoc && matchPractice
    })
  }, [listings, search, categoryFilter, payFilter, remoteOnly, locationFilter, practiceFilter])

  const selected = selectedId ? listings.find((l: any) => l.id === selectedId) : null
  const applyPromptListing = applyPromptId ? listings.find((l: any) => l.id === applyPromptId) : null

  async function toggleSave(listingId: string) {
    const isSaved = savedIds.has(listingId)
    setSavedIds(prev => {
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

  function handleApplyClick(listingId: string) {
    // Show "did you apply?" prompt
    setApplyPromptId(listingId)
  }

  async function confirmApplied(listingId: string) {
    setAppliedIds(prev => new Set(prev).add(listingId))
    setApplyPromptId(null)
    const listing = listings.find((l: any) => l.id === listingId)
    await supabase.from('applications').upsert({
      user_id: userId,
      listing_id: listingId,
      status: 'Applied',
      deadline: listing?.deadline ?? null,
      applied_at: new Date().toISOString(),
    }, { onConflict: 'user_id,listing_id' })
  }

  function daysLeft(deadline: string | null): number | null {
    if (!deadline) return null
    return differenceInDays(new Date(deadline), new Date())
  }

  const allCategories = ['All', ...Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a])]

  const selectStyle = {
    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px',
    color: 'var(--muted)', fontSize: '12px', padding: '5px 10px', cursor: 'pointer',
    fontFamily: 'inherit', outline: 'none', appearance: 'none' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)', gap: '16px', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', flex: 1 }}>All Listings</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', flex: 1, maxWidth: '400px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>⌕</span>
          <input
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '13px', padding: '9px 0', width: '100%', fontFamily: 'inherit' }}
            placeholder="Search roles, orgs, practice areas, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', padding: '0', lineHeight: 1 }}>✕</button>
          )}
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
                The scraper hasn't run yet. Trigger it from GitHub Actions or add a listing manually.
              </div>
              <a href="/dashboard/submit" className="btn btn-primary" style={{ display: 'inline-block' }}>+ Add a listing manually</a>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Total Listings', value: stats.total, sub: `+${stats.newThisWeek} this week`, subColor: 'var(--green)' },
                  { label: 'New This Week', value: stats.newThisWeek, sub: null, subColor: null },
                  { label: 'Paid / Stipend', value: stats.paid, sub: null, subColor: null },
                  { label: 'Remote Options', value: stats.remote, sub: null, subColor: null },
                ].map(({ label, value, sub, subColor }) => (
                  <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--text)' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>{label}</div>
                    {sub && <div style={{ fontSize: '11px', color: subColor ?? 'var(--muted)', marginTop: '4px' }}>{sub}</div>}
                  </div>
                ))}
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {allCategories.map((cat) => {
                  const count = cat === 'All' ? stats.total : (byCategory[cat] ?? 0)
                  const active = categoryFilter === cat
                  return (
                    <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                      padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)',
                      background: active ? (CATEGORY_COLORS[cat] ?? 'var(--accent)') : 'transparent',
                      color: active ? (CATEGORY_TEXT[cat] ?? '#1a1200') : 'var(--muted)',
                      fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: active ? 500 : 400, transition: 'all 0.1s', whiteSpace: 'nowrap',
                    }}>
                      {cat} <span style={{ opacity: 0.6, marginLeft: '4px' }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              {/* Filter row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['All', 'Paid', 'Stipend', 'Unpaid'].map((p) => (
                  <button key={p} onClick={() => setPayFilter(p)} style={{
                    padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border)',
                    background: payFilter === p ? 'rgba(45,95,179,0.18)' : 'transparent',
                    color: payFilter === p ? 'var(--accent3)' : 'var(--muted)',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}>{p}</button>
                ))}
                <button onClick={() => setRemoteOnly(!remoteOnly)} style={{
                  padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border)',
                  background: remoteOnly ? 'rgba(82,196,127,0.12)' : 'transparent',
                  color: remoteOnly ? 'var(--green)' : 'var(--muted)',
                  fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                }}>Remote Only</button>

                {/* Location dropdown */}
                {locations.length > 2 && (
                  <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={selectStyle}>
                    {locations.slice(0, 30).map(loc => (
                      <option key={loc} value={loc}>{loc === 'All' ? '📍 All Locations' : loc}</option>
                    ))}
                  </select>
                )}

                {/* Practice area dropdown */}
                {practiceAreas.length > 2 && (
                  <select value={practiceFilter} onChange={e => setPracticeFilter(e.target.value)} style={selectStyle}>
                    {practiceAreas.map(area => (
                      <option key={area} value={area}>{area === 'All' ? '⚖ All Practice Areas' : area}</option>
                    ))}
                  </select>
                )}

                {/* Clear filters */}
                {(categoryFilter !== 'All' || payFilter !== 'All' || remoteOnly || locationFilter !== 'All' || practiceFilter !== 'All' || search) && (
                  <button onClick={() => {
                    setCategoryFilter('All'); setPayFilter('All'); setRemoteOnly(false)
                    setLocationFilter('All'); setPracticeFilter('All'); setSearch('')
                  }} style={{
                    padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(224,82,82,0.3)',
                    background: 'rgba(224,82,82,0.08)', color: 'var(--red)',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                  }}>✕ Clear filters</button>
                )}
              </div>

              {/* Results count */}
              {filtered.length !== listings.length && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                  Showing {filtered.length} of {listings.length} listings
                </div>
              )}

              {/* Listing cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                    No listings match your filters.
                  </div>
                ) : filtered.map((l: any) => {
                  const dl = daysLeft(l.deadline)
                  const saved = savedIds.has(l.id)
                  const applied = appliedIds.has(l.id)
                  const isNew = differenceInDays(new Date(), new Date(l.created_at)) < 7
                  const cat = l.category || 'Legal'

                  return (
                    <div
                      key={l.id}
                      onClick={() => openDetail(l.id)}
                      style={{
                        background: 'var(--bg2)',
                        border: `1px solid ${applied ? 'rgba(82,196,127,0.3)' : saved ? 'rgba(45,95,179,0.4)' : 'var(--border)'}`,
                        borderLeft: applied ? '3px solid var(--green)' : saved ? '3px solid var(--accent2)' : '3px solid transparent',
                        borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', display: 'flex',
                        alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{l.title}</span>
                          {isNew && <span className="tag tag-new" style={{ fontSize: '10px' }}>New</span>}
                          {applied && <span style={{ fontSize: '10px', color: 'var(--green)', background: 'rgba(82,196,127,0.1)', padding: '1px 7px', borderRadius: '10px' }}>Applied ✓</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                          {l.organization} · {l.location}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Clickable category tag */}
                          <span
                            onClick={(e) => { e.stopPropagation(); setCategoryFilter(cat) }}
                            style={{
                              display: 'inline-block', padding: '2px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
                              background: CATEGORY_COLORS[cat] ?? 'rgba(45,95,179,0.20)',
                              color: CATEGORY_TEXT[cat] ?? '#6b9ae8',
                              cursor: 'pointer',
                            }}
                            title={`Filter by ${cat}`}
                          >{cat}</span>
                          <span className={`tag ${PAY_CLASS[l.pay_type] ?? ''}`}>{l.pay_type}</span>
                          {/* Clickable practice area tag */}
                          {l.practice_area && (
                            <span
                              onClick={(e) => { e.stopPropagation(); setPracticeFilter(l.practice_area) }}
                              className="tag"
                              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', cursor: 'pointer' }}
                              title={`Filter by ${l.practice_area}`}
                            >{l.practice_area}</span>
                          )}
                          {l.remote && (
                            <span
                              onClick={(e) => { e.stopPropagation(); setRemoteOnly(true) }}
                              className="tag"
                              style={{ background: 'rgba(82,196,127,0.1)', color: 'var(--green)', cursor: 'pointer' }}
                            >Remote</span>
                          )}
                        </div>
                        {dl !== null && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: dl < 14 ? 'var(--amber)' : 'var(--muted)' }}>
                            ⏱ {dl < 0 ? 'Closed' : dl === 0 ? 'Due today' : `${dl}d left`}
                          </div>
                        )}
                        {l.rolling && !dl && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)' }}>⏱ Rolling</div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSave(l.id)} style={{
                          border: `1px solid ${saved ? 'var(--accent2)' : 'var(--border)'}`,
                          borderRadius: '6px', color: saved ? 'var(--accent3)' : 'var(--muted)',
                          padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                          background: saved ? 'rgba(45,95,179,0.10)' : 'transparent',
                        }}>{saved ? '✦ Saved' : '✧ Save'}</button>
                        <a
                          href={l.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); handleApplyClick(l.id) }}
                          style={{
                            background: applied ? 'rgba(82,196,127,0.10)' : 'rgba(45,95,179,0.12)',
                            border: `1px solid ${applied ? 'rgba(82,196,127,0.3)' : 'rgba(45,95,179,0.3)'}`,
                            borderRadius: '6px',
                            color: applied ? 'var(--green)' : 'var(--accent3)',
                            padding: '5px 10px', fontSize: '11px', textDecoration: 'none',
                            textAlign: 'center', display: 'block',
                          }}
                        >{applied ? 'Applied ✓' : 'Apply ↗'}</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          listing={selected}
          saved={savedIds.has(selected.id)}
          applied={appliedIds.has(selected.id)}
          onClose={() => setSelectedId(null)}
          onSave={() => toggleSave(selected.id)}
          onApplyClick={() => handleApplyClick(selected.id)}
        />
      )}

      {/* Apply prompt modal */}
      {applyPromptListing && (
        <ApplyPrompt
          listing={applyPromptListing}
          onApplied={() => confirmApplied(applyPromptListing.id)}
          onSkip={() => setApplyPromptId(null)}
          onClose={() => setApplyPromptId(null)}
        />
      )}
    </div>
  )
}
