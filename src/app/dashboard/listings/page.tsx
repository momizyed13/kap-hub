// src/app/dashboard/listings/page.tsx
// Auth is in middleware. Page just fetches and renders.
import { createClient } from '@/lib/supabase/server'
import ListingsClient from './ListingsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; type?: string; pay?: string; remote?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user (shouldn't happen due to middleware, but defensive), render empty state
  if (!user) {
    return (
      <div style={{ padding: '40px', color: 'var(--muted)', textAlign: 'center' }}>
        <p>Session expired. <a href="/auth/login" style={{ color: 'var(--accent3)' }}>Sign in again</a></p>
      </div>
    )
  }

  let query = supabase
    .from('listings')
    .select('*')
    .eq('active', true)
    .eq('undergrad_ok', true)
    .order('created_at', { ascending: false })
    .limit(500)

  if (searchParams.category && searchParams.category !== 'All') {
    query = query.eq('category', searchParams.category)
  }
  if (searchParams.type) query = query.eq('org_type', searchParams.type)
  if (searchParams.pay) query = query.eq('pay_type', searchParams.pay)
  if (searchParams.remote === 'true') query = query.eq('remote', true)

  const { data: listings, error } = await query

  if (error) {
    console.error('Listings query failed:', error)
  }

  const { data: saved } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', user.id)

  const savedIds = (saved ?? []).map((s: any) => s.listing_id)
  const all = listings ?? []

  const stats = {
    total: all.length,
    newThisWeek: all.filter((l: any) => {
      const created = new Date(l.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return created > weekAgo
    }).length,
    paid: all.filter((l: any) => l.pay_type === 'Paid' || l.pay_type === 'Stipend').length,
    remote: all.filter((l: any) => l.remote).length,
  }

  const byCategory = all.reduce((acc: Record<string, number>, l: any) => {
    const cat = l.category || 'Legal'
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})

  return (
    <ListingsClient
      listings={all as any}
      savedIds={savedIds}
      userId={user.id}
      stats={stats}
      byCategory={byCategory}
      initialFilters={searchParams}
    />
  )
}
