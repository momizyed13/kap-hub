// scripts/scrape.mjs
// Main scraper orchestrator. Runs all sources, AI-tags, dedupes, upserts.

import { createClient } from '@supabase/supabase-js'
import { scrapeUSAJobs } from './scrapers/usajobs.mjs'
import { scrapeUNCareers } from './scrapers/un-careers.mjs'
import { scrapeHTMLSites } from './scrapers/html-sites.mjs'
import { tagListings } from './scrapers/ai-tagger.mjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function upsertListings(listings) {
  let added = 0
  let updated = 0

  for (const listing of listings) {
    if (!listing.title || !listing.organization || !listing.apply_url) continue
    if (listing.title.length < 5 || listing.title.length > 200) continue

    const { data: existing } = await supabase
      .from('listings')
      .select('id')
      .eq('external_id', listing.external_id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('listings')
        .update({
          deadline: listing.deadline,
          description: listing.description,
          category: listing.category,
          practice_area: listing.practice_area,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      updated++
    } else {
      const { error } = await supabase.from('listings').insert(listing)
      if (!error) added++
      else if (!error.message.includes('duplicate')) {
        console.warn(`  Insert failed: ${error.message}`)
      }
    }
  }
  return { added, updated }
}

async function main() {
  console.log('========================================')
  console.log('KAP Pre-Law Scraper v2')
  console.log(`Started: ${new Date().toISOString()}`)
  console.log('========================================\n')

  const start = Date.now()

  console.log('[1/4] USAJobs API...')
  const usajobs = await scrapeUSAJobs()
  console.log(`  → ${usajobs.length} listings\n`)

  console.log('[2/4] UN Careers API...')
  const un = await scrapeUNCareers()
  console.log(`  → ${un.length} listings\n`)

  console.log('[3/4] HTML sites (25+ orgs)...')
  const html = await scrapeHTMLSites()
  console.log(`  → ${html.length} listings total\n`)

  const allRaw = [...usajobs, ...un, ...html]
  console.log(`Total raw: ${allRaw.length}`)

  console.log('\n[4/4] AI tagging + filtering...')
  const tagged = await tagListings(allRaw)

  console.log('\nUpserting to database...')
  const { added, updated } = await upsertListings(tagged)

  // Summary by category
  const byCategory = tagged.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1
    return acc
  }, {})

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log('\n========================================')
  console.log(`Complete in ${elapsed}s`)
  console.log(`  New:     ${added}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Filtered out: ${allRaw.length - tagged.length}`)
  console.log('\nBy category:')
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(15)} ${count}`)
  }
  console.log('========================================')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
