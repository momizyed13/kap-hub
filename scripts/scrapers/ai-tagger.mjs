// scripts/scrapers/ai-tagger.mjs
// Uses Claude Haiku to clean, categorize, and filter listings.
// Costs ~$0.30-0.80/month at hourly cadence with this many sources.

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a data normalizer for a pre-law student org's internship hub. The hub serves UNDERGRADUATES at Kappa Alpha Pi (a pre-law fraternity). You receive raw scraped listings and return clean structured JSON.

Your job:

1. Determine if the listing is RELEVANT and UNDERGRAD-ELIGIBLE. Set "relevant": false if:
   - Requires JD, law degree, bar admission, or being a current law student
   - Requires post-grad work experience (2+ years)
   - Is for graduate students only (LLM, MBA, PhD)
   - Is for senior/manager/director level
   - Is generic non-undergrad (full-time professional roles)
   - Is unrelated to anything we want (warehouse work, retail, food service, basic IT support)

2. Set the CATEGORY (this determines how it shows up in the UI):
   - "Legal": Law firm, public defender, legal aid, paralegal, anything explicitly legal practice
   - "Policy": Think tanks, legislative, policy analysis, regulatory advocacy
   - "Government": Federal/state/local agencies, courts, AG offices (default for gov roles unless clearly legal-practice)
   - "Finance": Investment banking, compliance, asset management, financial regulation (only undergrad programs)
   - "Consulting": Strategy consulting, risk advisory, public sector consulting (only undergrad programs)
   - "Tech-Policy": EFF, CDT, Mozilla policy, internet governance
   - "Compliance": Corporate compliance, regulatory affairs, ethics roles
   - "Research": Academic legal research, judicial research, RA roles
   - "Advocacy": NGO advocacy not strictly legal
   - "International": UN, ICRC, global human rights orgs
   - "Other": pre-law adjacent that doesn't fit elsewhere

3. Set the practice_area precisely (e.g. "Civil Rights", "Environmental Law", "Securities Regulation", "Investment Banking", "Strategy Consulting")

4. Set pay_type: "Paid", "Unpaid", or "Stipend" - infer from context

5. Set remote: true if the listing mentions remote/hybrid/work-from-home

6. Write a clean 1-2 sentence description in your own words explaining what the role does and what it's good for. DO NOT copy from the source.

7. Clean the title - remove agency codes, dates, location prefixes, etc.

Return ONLY valid JSON, no markdown:
{
  "relevant": boolean,
  "category": string,
  "practice_area": string,
  "pay_type": "Paid" | "Unpaid" | "Stipend",
  "undergrad_ok": boolean,
  "remote": boolean,
  "description": string,
  "title_clean": string
}`

async function tagOne(listing) {
  if (!CLAUDE_API_KEY) {
    return { ...listing, relevant: true, category: listing.category || 'Legal' }
  }

  const userMsg = `Title: ${listing.title}
Organization: ${listing.organization}
Initial Category Guess: ${listing.category || 'Unknown'}
Org Type: ${listing.org_type}
Location: ${listing.location}
Description: ${(listing.description ?? '').slice(0, 1200)}
URL: ${listing.apply_url}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    if (!res.ok) return { ...listing, relevant: true, category: listing.category || 'Legal' }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ...listing, relevant: true, category: listing.category || 'Legal' }

    const tagged = JSON.parse(jsonMatch[0])

    if (!tagged.relevant) return null
    if (!tagged.undergrad_ok) return null

    return {
      ...listing,
      title: tagged.title_clean || listing.title,
      category: tagged.category || listing.category || 'Legal',
      practice_area: tagged.practice_area || listing.practice_area || 'General',
      pay_type: tagged.pay_type || listing.pay_type,
      undergrad_ok: tagged.undergrad_ok ?? true,
      remote: tagged.remote ?? listing.remote ?? false,
      description: tagged.description || listing.description,
    }
  } catch (err) {
    console.warn(`  AI tag error: ${err.message}`)
    return { ...listing, relevant: true, category: listing.category || 'Legal' }
  }
}

export async function tagListings(listings) {
  const tagged = []
  let rejectedIrrelevant = 0
  let rejectedNotUndergrad = 0

  // Process in parallel batches of 5 to speed things up without hitting rate limits
  for (let i = 0; i < listings.length; i += 5) {
    const batch = listings.slice(i, i + 5)
    const results = await Promise.all(batch.map(tagOne))
    for (const r of results) {
      if (r === null) {
        rejectedIrrelevant++
        continue
      }
      tagged.push(r)
    }
  }

  console.log(`  Kept ${tagged.length}, rejected ${rejectedIrrelevant} (irrelevant or not undergrad)`)
  return tagged
}
