'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

const JOIN_CODE = 'kappa2026'

function SignupForm() {
  const [step, setStep] = useState<'verify' | 'register'>('verify')
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  function verifyAccess() {
    setError(null)
    if (code.trim().toLowerCase() === JOIN_CODE) {
      setStep('register')
    } else {
      setError('Invalid code. Contact a chapter officer for access.')
    }
  }

  async function handleSignup() {
    setError(null)
    if (!email.trim()) { setError('Email is required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (signupError) { setError(signupError.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'24px' }}>
        <div style={{ width:'100%', maxWidth:'400px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'16px', padding:'36px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'32px', color:'var(--accent3)', letterSpacing:'4px', marginBottom:'20px' }}>ΚΑΠ</div>
          <div style={{ fontSize:'18px', color:'var(--green)', marginBottom:'12px' }}>✓ Check your email</div>
          <div style={{ fontSize:'13px', color:'var(--muted)', lineHeight:'1.7' }}>
            We sent a confirmation link to <strong style={{ color:'var(--text)' }}>{email}</strong>. Click it to activate your account.
          </div>
          <a href="/auth/login" style={{ display:'block', marginTop:'24px', color:'var(--accent3)', fontSize:'13px', textDecoration:'none' }}>Back to login →</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:'400px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'16px', padding:'36px' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'32px', color:'var(--accent3)', letterSpacing:'4px', marginBottom:'6px' }}>ΚΑΠ</div>
          <div style={{ fontSize:'11px', color:'var(--muted)', letterSpacing:'2px', textTransform:'uppercase' }}>
            {step === 'verify' ? 'Member Access' : 'Create Account'}
          </div>
        </div>

        {step === 'verify' && (
          <>
            <div style={{ fontSize:'13px', color:'var(--muted)', marginBottom:'20px', lineHeight:'1.6' }}>
              Enter the chapter access code to join.
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label className="form-label">Access Code</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter code"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyAccess()}
                autoFocus
              />
            </div>
            {error && (
              <div style={{ background:'rgba(224,82,82,0.1)', border:'1px solid rgba(224,82,82,0.2)', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', color:'var(--red)', marginBottom:'14px' }}>
                {error}
              </div>
            )}
            <button className="btn btn-primary" style={{ width:'100%', padding:'11px' }} onClick={verifyAccess}>Continue →</button>
            <div style={{ textAlign:'center', marginTop:'18px', fontSize:'12px', color:'var(--muted)' }}>
              Already a member? <a href="/auth/login" style={{ color:'var(--accent3)', textDecoration:'none' }}>Sign in</a>
            </div>
          </>
        )}

        {step === 'register' && (
          <>
            <div style={{ marginBottom:'14px' }}>
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="netid@illinois.edu" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label className="form-label">Confirm Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
              />
            </div>
            {error && (
              <div style={{ background:'rgba(224,82,82,0.1)', border:'1px solid rgba(224,82,82,0.2)', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', color:'var(--red)', marginBottom:'14px' }}>
                {error}
              </div>
            )}
            <button className="btn btn-primary" style={{ width:'100%', padding:'11px' }} onClick={handleSignup} disabled={loading}>
              {loading ? 'Creating account...' : 'Join KAP Hub'}
            </button>
            <button onClick={() => { setStep('verify'); setError(null) }} style={{ display:'block', width:'100%', marginTop:'12px', background:'transparent', border:'none', color:'var(--muted)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <SignupForm />
    </Suspense>
  )
}
