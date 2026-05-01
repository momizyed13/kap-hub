'use client'
// src/app/auth/signup/page.tsx
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const supabase = createClient()

  useEffect(() => {
    if (!token) { setValidating(false); return }
    // Validate invite token
    supabase
      .from('invites')
      .select('email, used, expires_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setError('Invalid invite link.'); setValidating(false); return }
        if (data.used) { setError('This invite has already been used.'); setValidating(false); return }
        if (new Date(data.expires_at) < new Date()) { setError('This invite has expired.'); setValidating(false); return }
        setEmail(data.email)
        setTokenValid(true)
        setValidating(false)
      })
  }, [token])

  async function handleSignup() {
    if (!tokenValid) return
    setLoading(true)
    setError(null)

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })

    if (signupError) { setError(signupError.message); setLoading(false); return }

    // Mark invite as used
    await supabase.from('invites').update({ used: true }).eq('token', token!)

    router.push('/dashboard')
    router.refresh()
  }

  if (validating) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
        <div style={{ color:'var(--muted)', fontSize:'13px' }}>Validating invite...</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:'24px'
    }}>
      <div style={{
        width:'100%', maxWidth:'400px', background:'var(--bg2)',
        border:'1px solid var(--border)', borderRadius:'16px', padding:'36px'
      }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'32px', color:'var(--accent)', letterSpacing:'4px', marginBottom:'6px' }}>ΚΑΠ</div>
          <div style={{ fontSize:'11px', color:'var(--muted)', letterSpacing:'2px', textTransform:'uppercase' }}>Create Your Account</div>
        </div>

        {!tokenValid && !validating ? (
          <div style={{
            background:'rgba(224,82,82,0.1)', border:'1px solid rgba(224,82,82,0.2)',
            borderRadius:'8px', padding:'16px', fontSize:'13px', color:'var(--red)', textAlign:'center'
          }}>
            {error || 'You need a valid invite link to join. Contact a chapter officer.'}
          </div>
        ) : (
          <>
            <div style={{ marginBottom:'14px' }}>
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} disabled style={{ opacity:0.6 }} />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && (
              <div style={{
                background:'rgba(224,82,82,0.1)', border:'1px solid rgba(224,82,82,0.2)',
                borderRadius:'8px', padding:'10px 12px', fontSize:'13px', color:'var(--red)', marginBottom:'16px'
              }}>{error}</div>
            )}

            <button className="btn btn-primary" style={{ width:'100%', padding:'11px' }} onClick={handleSignup} disabled={loading}>
              {loading ? 'Creating account...' : 'Join KAP Hub'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
