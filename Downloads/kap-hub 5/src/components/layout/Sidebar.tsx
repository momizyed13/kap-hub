'use client'
// src/components/layout/Sidebar.tsx
// Updated to use Next.js Link with prefetch for instant navigation

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { label: 'All Listings',    href: '/dashboard/listings', icon: '◈', section: 'Discover' },
  { label: 'Saved',           href: '/dashboard/saved',    icon: '◇', section: 'Discover' },
  { label: 'My Applications', href: '/dashboard/tracker',  icon: '▣', section: 'Track' },
  { label: 'Add Listing',     href: '/dashboard/submit',   icon: '+', section: 'Contribute' },
]

const ADMIN_NAV = [
  { label: 'Manage Listings', href: '/admin/listings', icon: '⊞', section: 'Admin' },
  { label: 'Invites',         href: '/admin/invites',  icon: '✉', section: 'Admin' },
  { label: 'Scraper',         href: '/admin/scraper',  icon: '⟳', section: 'Admin' },
]

export default function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'officer'
  const allNav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV

  const sections = allNav.reduce((acc: Record<string, typeof NAV>, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {})

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'KA'

  return (
    <div style={{ width: '220px', minWidth: '220px', background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--accent3)', letterSpacing: '3px' }}>ΚΑΠ</div>
        <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '3px' }}>Pre-Law Hub</div>
      </div>

      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div style={{ padding: '10px 20px 5px', fontSize: '10px', color: 'var(--muted)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>{section}</div>
            {items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 20px', fontSize: '13px', textDecoration: 'none',
                    color: active ? 'var(--accent3)' : 'var(--muted)',
                    borderLeft: `2px solid ${active ? 'var(--accent2)' : 'transparent'}`,
                    background: active ? 'rgba(45,95,179,0.10)' : 'transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'Member'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'capitalize' }}>{profile?.role || 'member'}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
        >Sign Out</button>
      </div>
    </div>
  )
}
