'use client'
// src/app/auth/login/page.tsx
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/dashboard'
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(next)
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', background: 'var(--bg2)',
        border: '1px solid var(--border)', borderRadius: '16px', padding: '36px'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: '36px',
            color: 'var(--accent)', letterSpacing: '4px', marginBottom: '6px'
          }}>ΚΑΠ</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Kappa Alpha Pi · Pre-Law Hub
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            placeholder="you@illinois.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)',
            borderRadius: '8px', padding: '10px 12px', fontSize: '13px',
            color: 'var(--red)', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '11px' }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <a href="/auth/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Use your invite link
          </a>
        </div>
      </div>
    </div>
  )
}
