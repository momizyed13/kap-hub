// src/app/dashboard/listings/page.tsx
import { createClient } from '@/lib/supabase/server'
import ListingsClient from './ListingsClient'

export const revalidate = 60 // revalidate every 60 seconds

export default async function ListingsPage({
  searchParams
}: {
  searchParams: { q?: string; type?: string; pay?: string; remote?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('listings')
    .select('*')
    .eq('active', true)
    .eq('undergrad_ok', true)
    .order('created_at', { ascending: false })

  if (searchParams.type) query = query.eq('org_type', searchParams.type)
  if (searchParams.pay) query = query.eq('pay_type', searchParams.pay)
  if (searchParams.remote === 'true') query = query.eq('remote', true)

  const { data: listings } = await query

  // Get saved IDs for current user
  const { data: saved } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', user!.id)

  const savedIds = new Set(saved?.map(s => s.listing_id) ?? [])

  const stats = {
    total: listings?.length ?? 0,
    newThisWeek: listings?.filter(l => {
      const created = new Date(l.created_at)
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      return created > weekAgo
    }).length ?? 0,
    paid: listings?.filter(l => l.pay_type === 'Paid' || l.pay_type === 'Stipend').length ?? 0,
    remote: listings?.filter(l => l.remote).length ?? 0,
  }

  return (
    <ListingsClient
      listings={listings ?? []}
      savedIds={[...savedIds]}
      userId={user!.id}
      stats={stats}
      initialFilters={searchParams}
    />
  )
}
