'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ScraperPage() {
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchSources() }, [])

  async function fetchSources() {
    const { data } = await supabase.from('scraper_sources').select('*').order('name')
    setSources(data ?? [])
    setLoading(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('scraper_sources').update({ active: !current }).eq('id', id)
    setSources(prev => prev.map(s => s.id === id ? { ...s, active: !current } : s))
  }

  function timeAgo(date: string | null) {
    if (!date) return 'Never'
    const ms = Date.now() - new Date(date).getTime()
    const hours = Math.floor(ms / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', flex: 1 }}>Scraper Sources</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '8px', fontWeight: 500 }}>How it works</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.7' }}>
            The scraper runs automatically every 6 hours via GitHub Actions. It pulls listings from active sources below, deduplicates against existing entries, and uses AI tagging to classify by practice area. Toggle sources off to skip them on the next run.
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Loading...</div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Source', 'Type', 'Category', 'Last Run', 'Total Pulled', 'Active'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 16px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`tag ${s.source_type === 'api' ? 'tag-paid' : 'tag-gov'}`}>{s.source_type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--muted)' }}>{s.org_type ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--muted)' }}>{timeAgo(s.last_scraped)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{s.scrape_count}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => toggleActive(s.id, s.active)}
                        className={s.active ? 'btn btn-primary' : 'btn btn-ghost'}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        {s.active ? 'Active' : 'Paused'}
                      </button>
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
