// scripts/scrapers/usajobs.mjs
// USAJobs API scraper - covers federal legal, policy, regulatory, financial, intelligence
// All filtered to undergrad-eligible (GS-9 max, student indicator true)

const KEYWORDS = [
  // Legal
  'legal intern', 'paralegal', 'law clerk', 'legal assistant', 'student trainee legal', 'honors program',
  // Policy & regulatory
  'policy analyst intern', 'regulatory intern', 'policy intern', 'program analyst student',
  // Compliance & investigations
  'compliance intern', 'investigations intern',
  // Finance/economic with gov flavor
  'economist intern', 'financial analyst student',
  // Intelligence & national security undergrad
  'intelligence student', 'national security student',
  // International
  'foreign service student', 'international affairs intern',
]

export async function scrapeUSAJobs() {
  const results = []
  const apiKey = process.env.USAJOBS_API_KEY
  const userAgent = process.env.USAJOBS_USER_AGENT || 'kap-prelaw-hub'

  if (!apiKey) {
    console.warn('  USAJOBS_API_KEY not set, skipping USAJobs')
    return results
  }

  for (const keyword of KEYWORDS) {
    try {
      const url = new URL('https://data.usajobs.gov/api/search')
      url.searchParams.set('Keyword', keyword)
      url.searchParams.set('ResultsPerPage', '25')
      url.searchParams.set('StudentIndicator', 'True')

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization-Key': apiKey,
          'Host': 'data.usajobs.gov',
          'User-Agent': userAgent,
        },
      })

      if (!res.ok) continue
      const data = await res.json()

      for (const item of data.SearchResult?.SearchResultItems ?? []) {
        const pos = item.MatchedObjectDescriptor
        if (!pos) continue

        const lowGrade = parseInt(pos.UserArea?.Details?.LowGrade ?? '0')
        if (lowGrade > 9) continue

        const minPay = pos.PositionRemuneration?.[0]?.MinimumRange ?? 0
        const locationDisplay = pos.PositionLocationDisplay ?? ''

        results.push({
          title: pos.PositionTitle,
          organization: pos.OrganizationName,
          org_type: 'Government',
          category: 'Government', // AI tagger may reclassify (e.g. SEC -> Finance)
          pay_type: minPay > 0 ? 'Paid' : 'Unpaid',
          location: locationDisplay,
          remote: locationDisplay.toLowerCase().includes('remote'),
          deadline: pos.ApplicationCloseDate?.split('T')[0] ?? null,
          rolling: false,
          apply_url: pos.ApplyURI?.[0] ?? pos.PositionURI,
          description: (pos.UserArea?.Details?.JobSummary ?? '').slice(0, 1500),
          undergrad_ok: true,
          source: 'scraped',
          verified: false,
          external_id: `usajobs_${pos.PositionID}`,
          source_url: 'https://usajobs.gov',
        })
      }
    } catch (err) {
      console.error(`  USAJobs ${keyword}: ${err.message}`)
    }
  }

  const seen = new Set()
  return results.filter((r) => {
    if (seen.has(r.external_id)) return false
    seen.add(r.external_id)
    return true
  })
}
