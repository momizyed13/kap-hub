// src/app/auth/signup/page.tsx
// Server wrapper that disables static rendering completely
import SignupClient from './SignupClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function SignupPage() {
  return <SignupClient />
}
