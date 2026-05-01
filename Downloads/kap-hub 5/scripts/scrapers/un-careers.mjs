// scripts/scrapers/un-careers.mjs
// UN Careers has a JSON API for active openings
// Filters for internships and entry-level positions

export async function scrapeUNCareers() {
  const results = []

  try {
    const res = await fetch('https://careers.un.org/api/public/opening/jo/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        filterConfig: {
          keyword: 'intern',
        },
        pagination: { page: 1, itemPerPage: 100 },
        sortConfig: { sort: 'startDate', order: 'DESC' },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.warn(`  UN Careers: HTTP ${res.status}`)
      return results
    }

    const data = await res.json()
    const items = data.data ?? data.items ?? []

    for (const item of items) {
      const title = item.jobTitle || item.title
      if (!title) continue

      // Only undergrad-relevant (interns, junior officers)
      const titleLower = title.toLowerCase()
      if (!titleLower.includes('intern') && !titleLower.includes('young') && !titleLower.includes('jpo')) continue

      results.push({
        title,
        organization: item.organization || 'United Nations',
        org_type: 'International',
        category: 'International',
        pay_type: titleLower.includes('intern') ? 'Stipend' : 'Paid',
        location: item.dutyStation || item.location || 'Various',
        remote: false,
        deadline: item.endDate?.split('T')[0] ?? null,
        rolling: false,
        apply_url: `https://careers.un.org/jobSearchDescription/${item.jobId}`,
        description: (item.jobDescription || item.description || '').slice(0, 1500),
        practice_area: 'International Affairs',
        undergrad_ok: true,
        source: 'scraped',
        verified: false,
        external_id: `un_${item.jobId}`,
        source_url: 'https://careers.un.org',
      })
    }
  } catch (err) {
    console.error(`  UN Careers: ${err.message}`)
  }

  return results
}
