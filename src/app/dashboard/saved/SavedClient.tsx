'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'
import type { Listing } from '@/types/database'

const ORG_EMOJI: Record<string, string> = {
  'Government': '🏛️',
  'Nonprofit / NGO': '⚖️',
  'Law Firm': '🏢',
  'Policy': '🗳️',
  'Research': '📚',
  'Advocacy': '✊',
  'Judicial': '🔏',
  'Other': '📋',
}

const TAG_CLASS: Record<string, string> = {
  'Law Firm': 'tag-law',
  'Government': 'tag-gov',
  'Nonprofit / NGO': 'tag-ngo',
  'Policy': 'tag-policy',
  'Research': 'tag-policy',
  'Advocacy': 'tag-ngo',
  'Judicial': 'tag-gov',
  'Other': 'tag-gov',
}

const PAY_CLASS: Record<string, string> = {
  'Paid': 'tag-paid',
  'Stipend': 'tag-stipend',
  'Unpaid': 'tag-unpaid',
}

export default function SavedClient({ listings: initial, userId }: { listings: Listing[], userId: string }) {
  const [listings, setListings] = useState(initial)
  const supabase = createClient()

  async function unsave(id: string) {
    setListings(prev => prev.filter(l => l.id !== id))
    await supabase.from('saved_listings').delete().match({ user_id: userId, listing_id: id })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', flex: 1 }}>Saved Listings</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>◇</div>
            <div>No saved listings yet. Browse and save positions that interest you.</div>
            <a href="/dashboard/listings" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>Browse Listings</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {listings.map(l => {
              const dl = l.deadline ? differenceInDays(new Date(l.deadline), new Date()) : null
              return (
                <div
                  key={l.id}
                  style={{
                    background: 'var(--bg2)',
                    border: '1px solid rgba(200,169,110,0.3)',
                    borderLeft: '2px solid var(--accent)',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, border: '1px solid var(--border)' }}>
                    {ORG_EMOJI[l.org_type] ?? '📋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{l.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 8px' }}>{l.organization} · {l.location}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className={`tag ${TAG_CLASS[l.org_type] ?? 'tag-gov'}`}>{l.org_type}</span>
                      <span className={`tag ${PAY_CLASS[l.pay_type]}`}>{l.pay_type}</span>
                      {dl !== null && (
                        <span className="tag" style={{ background: dl < 21 ? 'rgba(224,144,82,0.12)' : 'rgba(255,255,255,0.05)', color: dl < 21 ? 'var(--amber)' : 'var(--muted)' }}>
                          {dl < 0 ? 'Closed' : `${dl}d left`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                    <a href={l.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '11px', textDecoration: 'none' }}>Apply ↗</a>
                    <button onClick={() => unsave(l.id)} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '11px' }}>Remove</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
