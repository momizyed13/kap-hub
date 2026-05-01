// src/app/page.tsx
// FIXED: was rendering login form ON TOP of the dashboard. Now does a clean redirect.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard/listings')
  }
  redirect('/auth/login')
}
