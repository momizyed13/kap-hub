'use client'
// src/app/dashboard/error.tsx
import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px', color: 'var(--accent3)' }}>!</div>
      <h2 style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '12px' }}>Something went wrong</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      <button onClick={reset} className="btn btn-primary">Try again</button>
    </div>
  )
}
