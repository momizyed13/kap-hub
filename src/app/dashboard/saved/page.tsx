import { createClient } from '@/lib/supabase/server'
import SavedClient from './SavedClient'

export const dynamic = 'force-dynamic'

export default async function SavedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: saved } = await supabase
    .from('saved_listings')
    .select('listing_id, listings(*)')
    .eq('user_id', user!.id)

  const listings = (saved ?? [])
    .map((s: any) => s.listings)
    .filter(Boolean)

  return <SavedClient listings={listings} userId={user!.id} />
}
