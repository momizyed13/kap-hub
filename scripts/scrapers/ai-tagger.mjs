// scripts/scrapers/ai-tagger.mjs
// Fixed: strips `relevant` field before returning so it doesn't break DB inserts

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a data normalizer for a pre-law student org's internship hub. The hub serves UNDERGRADUATES at Kappa Alpha Pi (a pre-law fraternity). You receive raw scraped listings and return clean structured JSON.

Your job:
1. Determine if relevant + undergrad-eligible. Set "relevant": false if requires JD/law degree/bar/post-grad, or unrelated to anything we want.
2. Set CATEGORY: Legal, Policy, Government, Finance, Consulting, Tech-Policy, Compliance, Research, Advocacy, International, Other
3. Set practice_area precisely
4. Set pay_type: Paid/Unpaid/Stipend
5. Set remote: true/false
6. Write a clean 1-2 sentence description in your own words
7. Clean the title - remove agency codes, dates, location prefixes

Return ONLY valid JSON:
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

// Strip fields that aren't actual DB columns before insert
function cleanForDB(listing) {
  const { relevant, ...clean } = listing
  return clean
}

async function tagOne(listing) {
  if (!CLAUDE_API_KEY) {
    return cleanForDB({ ...listing, category: listing.category || 'Legal' })
  }

  const userMsg = `Title: ${listing.title}
Organization: ${listing.organization}
Category Guess: ${listing.category || 'Unknown'}
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

    if (!res.ok) return cleanForDB({ ...listing, category: listing.category || 'Legal' })

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return cleanForDB({ ...listing, category: listing.category || 'Legal' })

    const tagged = JSON.parse(jsonMatch[0])
    if (!tagged.relevant) return null
    if (!tagged.undergrad_ok) return null

    return cleanForDB({
      ...listing,
      title: tagged.title_clean || listing.title,
      category: tagged.category || listing.category || 'Legal',
      practice_area: tagged.practice_area || listing.practice_area || 'General',
      pay_type: tagged.pay_type || listing.pay_type,
      undergrad_ok: tagged.undergrad_ok ?? true,
      remote: tagged.remote ?? listing.remote ?? false,
      description: tagged.description || listing.description,
    })
  } catch (err) {
    console.warn(`  AI tag error: ${err.message}`)
    return cleanForDB({ ...listing, category: listing.category || 'Legal' })
  }
}

export async function tagListings(listings) {
  const tagged = []
  let rejected = 0

  for (let i = 0; i < listings.length; i += 5) {
    const batch = listings.slice(i, i + 5)
    const results = await Promise.all(batch.map(tagOne))
    for (const r of results) {
      if (r === null) { rejected++; continue }
      tagged.push(r)
    }
  }

  console.log(`  Kept ${tagged.length}, rejected ${rejected}`)
  return tagged
}
