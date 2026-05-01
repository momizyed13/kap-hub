// scripts/scrape.mjs
// Run via: node scripts/scrape.mjs
// Schedule via GitHub Actions cron or Railway cron job
// Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // service role bypasses RLS
)

// ============================================================
// USAJobs API scraper (has official API — safest source)
// ============================================================
async function scrapeUSAJobs() {
  console.log('Scraping USAJobs...')
  const keywords = ['legal intern', 'paralegal', 'law clerk', 'policy analyst', 'attorney', 'legal assistant']
  const results = []

  for (const keyword of keywords) {
    const url = new URL('https://data.usajobs.gov/api/search')
    url.searchParams.set('Keyword', keyword)
    url.searchParams.set('ResultsPerPage', '25')
    url.searchParams.set('StudentIndicator', 'True') // student/intern roles

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization-Key': process.env.USAJOBS_API_KEY ?? '',
          'Host': 'data.usajobs.gov',
          'User-Agent': process.env.NEXT_PUBLIC_APP_URL ?? 'kap-hub',
        }
      })
      if (!res.ok) { console.warn(`USAJobs ${keyword}: ${res.status}`); continue }
      const data = await res.json()

      for (const item of (data.SearchResult?.SearchResultItems ?? [])) {
        const pos = item.MatchedObjectDescriptor
        if (!pos) continue

        // Filter: must be open to undergrads or recent grads (GS-4 to GS-9 range typically)
        const grade = pos.UserArea?.Details?.LowGrade
        if (grade && parseInt(grade) > 9) continue

        results.push({
          title: pos.PositionTitle,
          organization: pos.OrganizationName,
          org_type: 'Government',
          pay_type: pos.PositionRemuneration?.[0]?.MinimumRange > 0 ? 'Paid' : 'Unpaid',
          location: pos.PositionLocationDisplay,
          remote: pos.PositionLocationDisplay?.toLowerCase().includes('remote') ?? false,
          deadline: pos.ApplicationCloseDate?.split('T')[0] ?? null,
          rolling: false,
          apply_url: pos.ApplyURI?.[0] ?? pos.PositionURI,
          description: pos.UserArea?.Details?.JobSummary?.slice(0, 600) ?? null,
          practice_area: classifyPracticeArea(pos.PositionTitle + ' ' + (pos.UserArea?.Details?.JobSummary ?? '')),
          undergrad_ok: true,
          source: 'scraped',
          verified: false,
          external_id: pos.PositionID,
          source_url: 'https://usajobs.gov',
        })
      }
    } catch (err) {
      console.error(`USAJobs error (${keyword}):`, err.message)
    }
  }
  return results
}

// ============================================================
// Practice area classifier (simple keyword-based)
// ============================================================
function classifyPracticeArea(text) {
  const t = text.toLowerCase()
  if (t.includes('environment') || t.includes('climate') || t.includes('epa')) return 'Environmental Law'
  if (t.includes('immigration') || t.includes('asylum') || t.includes('visa')) return 'Immigration Law'
  if (t.includes('civil rights') || t.includes('discrimination') || t.includes('equality')) return 'Civil Rights'
  if (t.includes('criminal') || t.includes('prosecutor') || t.includes('defender')) return 'Criminal Law'
  if (t.includes('intellectual property') || t.includes('patent') || t.includes('copyright')) return 'IP Law'
  if (t.includes('antitrust') || t.includes('competition') || t.includes('ftc')) return 'Antitrust'
  if (t.includes('tax') || t.includes('irs') || t.includes('revenue')) return 'Tax Law'
  if (t.includes('policy') || t.includes('legislation') || t.includes('regulatory')) return 'Policy & Regulatory'
  if (t.includes('human rights') || t.includes('international')) return 'International / Human Rights'
  if (t.includes('public interest') || t.includes('nonprofit') || t.includes('advocacy')) return 'Public Interest'
  if (t.includes('labor') || t.includes('employment') || t.includes('workers')) return 'Labor & Employment'
  if (t.includes('health') || t.includes('fda') || t.includes('medical')) return 'Health Law'
  return 'General Legal'
}

// ============================================================
// Dedup + upsert into Supabase
// ============================================================
async function upsertListings(listings) {
  if (!listings.length) return 0
  let count = 0

  for (const listing of listings) {
    if (!listing.title || !listing.organization || !listing.apply_url) continue

    // Check for existing by external_id or (title + org) pair
    const { data: existing } = await supabase
      .from('listings')
      .select('id')
      .or(`external_id.eq.${listing.external_id},and(title.eq.${listing.title},organization.eq.${listing.organization})`)
      .single()

    if (existing) {
      // Update deadline/status only
      await supabase.from('listings').update({
        deadline: listing.deadline,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      const { error } = await supabase.from('listings').insert(listing)
      if (!error) count++
    }
  }
  return count
}

// ============================================================
// Update scraper source last_scraped timestamp
// ============================================================
async function logScrape(sourceName, count) {
  await supabase
    .from('scraper_sources')
    .update({ last_scraped: new Date().toISOString(), scrape_count: supabase.rpc('increment', { x: count }) })
    .eq('name', sourceName)
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('KAP Scraper starting...\n')
  const start = Date.now()

  // Phase 1: USAJobs API
  const usajobsListings = await scrapeUSAJobs()
  const usajobsCount = await upsertListings(usajobsListings)
  await logScrape('USAJobs API', usajobsCount)
  console.log(`USAJobs: ${usajobsCount} new listings added\n`)

  // More scrapers will be added here as we build them out:
  // const idealistListings = await scrapeIdealist()
  // const earthjusticeListings = await scrapeEarthjustice()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`Scrape complete in ${elapsed}s`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
