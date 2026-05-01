'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [organization, setOrganization] = useState('')
  const [orgType, setOrgType] = useState('Nonprofit / NGO')
  const [payType, setPayType] = useState('Unpaid')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [rolling, setRolling] = useState(false)
  const [applyUrl, setApplyUrl] = useState('')
  const [practiceArea, setPracticeArea] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function submit() {
    setError(null)
    if (!title || !organization || !applyUrl || !location) {
      setError('Title, organization, location, and apply URL are required.')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from('listings').insert({
      title, organization,
      org_type: orgType,
      pay_type: payType,
      location, remote,
      deadline: rolling ? null : (deadline || null),
      rolling,
      apply_url: applyUrl,
      practice_area: practiceArea || null,
      description: description || null,
      undergrad_ok: true,
      source: 'member',
      verified: false,
      submitted_by: user?.id,
    })
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }
    router.push('/dashboard/listings')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', flex: 1 }}>Add Listing</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: '640px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.6' }}>
            Found a position? Submit it for the chapter. Your listing will appear immediately and admins will review for quality.
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">Position Title *</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Legal Research Intern" />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">Organization *</label>
            <input className="form-input" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="e.g. ACLU of Illinois" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Category *</label>
              <select className="form-select" value={orgType} onChange={e => setOrgType(e.target.value)}>
                <option>Government</option>
                <option>Nonprofit / NGO</option>
                <option>Law Firm</option>
                <option>Policy</option>
                <option>Research</option>
                <option>Advocacy</option>
                <option>Judicial</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Pay *</label>
              <select className="form-select" value={payType} onChange={e => setPayType(e.target.value)}>
                <option>Paid</option>
                <option>Stipend</option>
                <option>Unpaid</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Location *</label>
              <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, ST" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '9px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={remote} onChange={e => setRemote(e.target.checked)} />
                Remote-friendly
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Deadline</label>
              <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} disabled={rolling} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '9px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={rolling} onChange={e => setRolling(e.target.checked)} />
                Rolling deadline
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">Application URL *</label>
            <input className="form-input" value={applyUrl} onChange={e => setApplyUrl(e.target.value)} placeholder="https://" />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">Practice Area / Focus</label>
            <input className="form-input" value={practiceArea} onChange={e => setPracticeArea(e.target.value)} placeholder="e.g. Civil Rights, Environmental Law" />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does the role involve? Eligibility notes, undergrad-friendly details..." rows={4} />
          </div>

          {error && (
            <div style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--red)', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="/dashboard/listings" className="btn btn-ghost" style={{ flex: 1 }}>Cancel</a>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Listing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
