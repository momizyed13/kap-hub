// scripts/scrapers/html-sites.mjs
// v3 - Updated URLs, added Idealist search scraping, Brookings iCIMS, think tanks
// Removed: dead BigLaw sources that moved to Workday/Greenhouse (JS-rendered)
// Added: Idealist keyword searches, Brookings, RAND, Urban Institute, Bipartisan Policy Center

import * as cheerio from 'cheerio'

const TIMEOUT = 15000

async function fetchHTML(url) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function fetchJSON(url) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ── IDEALIST SEARCH SCRAPER ──────────────────────────────────────────────────
// Idealist renders internship listings server-side for search pages
async function scrapeIdealist(keyword, category = 'Legal') {
  const encodedKeyword = encodeURIComponent(keyword)
  // Idealist's search URL - type=INTERNSHIP filters to internships only
  const url = `https://www.idealist.org/en/internships?q=${encodedKeyword}&type=INTERNSHIP&utm_source=kap`
  const html = await fetchHTML(url)
  if (!html) return []

  const $ = cheerio.load(html)
  const listings = []

  // Idealist renders listing cards with these selectors (as of 2025)
  $('[data-testid="listing-card"], [class*="ListingCard"], article[class*="listing"]').each((_, el) => {
    const $el = $(el)
    const title = $el.find('[class*="title"], h2, h3').first().text().trim()
    const org = $el.find('[class*="org"], [class*="organization"]').first().text().trim()
    const location = $el.find('[class*="location"]').first().text().trim() || 'Remote / Various'
    const linkEl = $el.find('a[href*="/internship/"], a[href*="/nonprofit-internship/"]').first()
    const href = linkEl.attr('href') || ''
    const applyUrl = href.startsWith('http') ? href : `https://www.idealist.org${href}`

    if (title && org && href) {
      listings.push({
        title,
        organization: org,
        location,
        apply_url: applyUrl,
        org_type: 'Nonprofit / NGO',
        category,
        pay_type: 'Unpaid',
        description: `${keyword} internship opportunity at ${org}.`,
        undergrad_ok: true,
        remote: location.toLowerCase().includes('remote'),
        rolling: true,
        source: 'idealist',
      })
    }
  })

  // Fallback: try JSON-LD data embedded in page
  if (listings.length === 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}')
        const items = Array.isArray(data) ? data : [data]
        items.forEach(item => {
          if (item['@type'] === 'JobPosting' || item.title) {
            listings.push({
              title: item.title || item.name || '',
              organization: item.hiringOrganization?.name || item.publisher?.name || '',
              location: item.jobLocation?.address?.addressLocality || 'Various',
              apply_url: item.url || item.sameAs || '',
              org_type: 'Nonprofit / NGO',
              category,
              pay_type: 'Unpaid',
              description: (item.description || '').slice(0, 500),
              undergrad_ok: true,
              remote: false,
              rolling: true,
              source: 'idealist',
            })
          }
        })
      } catch {}
    })
  }

  return listings
}

// ── BROOKINGS iCIMS API ──────────────────────────────────────────────────────
// iCIMS exposes a feed endpoint - Brookings uses their internship subdomain
async function scrapeBrookings() {
  // iCIMS has a job search feed endpoint
  const feedUrl = 'https://interns-brookings.icims.com/jobs/search?ss=1&searchCategory=0&searchPositionType=3&in_iframe=1&outputtype=json'
  const data = await fetchJSON(feedUrl)
  
  if (!data) {
    // Fallback: scrape the HTML listing page
    const html = await fetchHTML('https://interns-brookings.icims.com/jobs/search?ss=1&searchCategory=0&searchPositionType=3')
    if (!html) return []
    
    const $ = cheerio.load(html)
    const listings = []
    
    $('a.iCIMS_JobsTable_Title, .iCIMS-jobs-list a, .iCIMS_Anchors_Link').each((_, el) => {
      const $el = $(el)
      const title = $el.text().trim()
      const href = $el.attr('href') || ''
      if (title && href && title.toLowerCase().includes('intern')) {
        listings.push({
          title,
          organization: 'Brookings Institution',
          location: 'Washington, DC (Hybrid/Remote)',
          apply_url: href.startsWith('http') ? href : `https://interns-brookings.icims.com${href}`,
          org_type: 'Research',
          category: 'Policy',
          pay_type: 'Paid',
          description: 'Paid research or policy internship at the Brookings Institution, one of the most influential think tanks in the world.',
          undergrad_ok: true,
          remote: true,
          rolling: false,
          source: 'brookings',
        })
      }
    })
    return listings
  }

  const jobs = Array.isArray(data) ? data : (data.jobs || data.results || [])
  return jobs.map((j) => ({
    title: j.title || j.job_title || '',
    organization: 'Brookings Institution',
    location: j.location || 'Washington, DC',
    apply_url: j.url || j.apply_url || 'https://www.brookings.edu/careers/internships/',
    org_type: 'Research',
    category: 'Policy',
    pay_type: 'Paid',
    description: j.description || 'Paid research or operations internship at the Brookings Institution.',
    undergrad_ok: true,
    remote: (j.location || '').toLowerCase().includes('remote'),
    rolling: false,
    source: 'brookings',
  }))
}

// ── RAND Corporation ─────────────────────────────────────────────────────────
async function scrapeRAND() {
  const html = await fetchHTML('https://www.rand.org/jobs/student.html')
  if (!html) return []
  const $ = cheerio.load(html)
  const listings = []

  $('a[href*="/jobs/"]').each((_, el) => {
    const $el = $(el)
    const title = $el.text().trim()
    const href = $el.attr('href') || ''
    if (title && href && (title.toLowerCase().includes('intern') || title.toLowerCase().includes('student'))) {
      listings.push({
        title,
        organization: 'RAND Corporation',
        location: 'Various (Remote/Hybrid)',
        apply_url: href.startsWith('http') ? href : `https://www.rand.org${href}`,
        org_type: 'Research',
        category: 'Research',
        pay_type: 'Paid',
        description: 'Research internship at RAND Corporation, a leading nonpartisan think tank focused on national security, policy, and global affairs.',
        undergrad_ok: true,
        remote: true,
        rolling: false,
        source: 'rand',
      })
    }
  })
  return listings
}

// ── Urban Institute ──────────────────────────────────────────────────────────
async function scrapeUrbanInstitute() {
  const html = await fetchHTML('https://www.urban.org/about/jobs')
  if (!html) return []
  const $ = cheerio.load(html)
  const listings = []

  $('a[href*="intern"], a[href*="/jobs/"]').each((_, el) => {
    const $el = $(el)
    const title = $el.text().trim()
    const href = $el.attr('href') || ''
    if (title && href && title.toLowerCase().includes('intern')) {
      listings.push({
        title,
        organization: 'Urban Institute',
        location: 'Washington, DC',
        apply_url: href.startsWith('http') ? href : `https://www.urban.org${href}`,
        org_type: 'Research',
        category: 'Policy',
        pay_type: 'Paid',
        description: 'Policy research internship at the Urban Institute, focused on economic opportunity, housing, education, and health.',
        undergrad_ok: true,
        remote: false,
        rolling: false,
        source: 'urban-institute',
      })
    }
  })
  return listings
}

// ── Bipartisan Policy Center ─────────────────────────────────────────────────
async function scrapeBPC() {
  const html = await fetchHTML('https://bipartisanpolicy.org/about/jobs/')
  if (!html) return []
  const $ = cheerio.load(html)
  const listings = []

  $('a').each((_, el) => {
    const $el = $(el)
    const title = $el.text().trim()
    const href = $el.attr('href') || ''
    if (title && title.toLowerCase().includes('intern') && href) {
      listings.push({
        title,
        organization: 'Bipartisan Policy Center',
        location: 'Washington, DC',
        apply_url: href.startsWith('http') ? href : `https://bipartisanpolicy.org${href}`,
        org_type: 'Policy',
        category: 'Policy',
        pay_type: 'Stipend',
        description: 'Policy internship at the Bipartisan Policy Center, a think tank that drives principled solutions through rigorous analysis and genuine dialogue.',
        undergrad_ok: true,
        remote: false,
        rolling: false,
        source: 'bpc',
      })
    }
  })
  return listings
}

// ── Cooley LLP (correct URL) ─────────────────────────────────────────────────
async function scrapeCooley() {
  const html = await fetchHTML('https://www.cooley.com/careers/law-students/us-1l-diversity-fellowship')
  if (!html) return []
  return [{
    title: '1L Diversity Fellowship',
    organization: 'Cooley LLP',
    location: 'Various US Offices',
    apply_url: 'https://www.cooley.com/careers/law-students/us-1l-diversity-fellowship',
    org_type: 'Law Firm',
    category: 'Legal',
    pay_type: 'Paid',
    description: 'Cooley\'s 1L Diversity Fellowship offers first-year law students in-depth legal training and real-world experience at one of the firm\'s US offices.',
    undergrad_ok: false, // law school only
    remote: false,
    rolling: false,
    source: 'cooley',
  }]
}

// ── Latham & Watkins (correct URL) ───────────────────────────────────────────
async function scrapeLatham() {
  return [{
    title: 'Pathways 1L Diversity Scholars Program',
    organization: 'Latham & Watkins',
    location: 'Various US Offices',
    apply_url: 'https://www.lwcareers.com/en/beginning-your-legal-career/united-states/pathways-program',
    org_type: 'Law Firm',
    category: 'Legal',
    pay_type: 'Paid',
    description: 'Latham\'s Pathways Program offers 1L and 2L diversity scholars in-depth legal training, mentoring, and real-world experience at one of the firm\'s US offices.',
    undergrad_ok: false, // law school only
    remote: false,
    rolling: false,
    source: 'latham',
  }]
}

// ── EXISTING WORKING SOURCES ─────────────────────────────────────────────────
async function scrapeSource(source) {
  const { name, url, org, org_type, category } = source
  const html = await fetchHTML(url)
  if (!html) return { name, count: 0, error: `HTTP error` }

  const $ = cheerio.load(html)
  const listings = []

  // Generic link extraction - find job/internship links
  const selectors = [
    'a[href*="intern"]',
    'a[href*="job"]',
    'a[href*="career"]',
    'a[href*="position"]',
    '.job-title a',
    '.position-title a',
    'h2 a', 'h3 a', 'h4 a',
    '[class*="job"] a',
    '[class*="career"] a',
    '[class*="position"] a',
    '[class*="listing"] a',
    '[class*="opportunity"] a',
  ]

  const seen = new Set()
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el)
      const title = $el.text().trim()
      const href = $el.attr('href') || ''
      const key = title.toLowerCase().slice(0, 50)

      if (!title || title.length < 5 || title.length > 200 || seen.has(key)) return
      if (!href || href === '#' || href.startsWith('mailto:') || href.startsWith('tel:')) return

      const titleLower = title.toLowerCase()
      const relevant = ['intern', 'fellow', 'scholar', 'associate', 'program', 'position', 'opportunity'].some(k => titleLower.includes(k))
      if (!relevant) return

      seen.add(key)
      const applyUrl = href.startsWith('http') ? href : `${new URL(url).origin}${href.startsWith('/') ? '' : '/'}${href}`

      listings.push({
        title,
        organization: org,
        location: 'See posting',
        apply_url: applyUrl,
        org_type,
        category,
        pay_type: 'Unpaid',
        description: `${org} internship or fellowship opportunity in ${category.toLowerCase()}.`,
        undergrad_ok: true,
        remote: false,
        rolling: true,
        source: name.toLowerCase().replace(/\s+/g, '-'),
      })
    })
    if (listings.length > 0) break
  }

  return listings
}

// ── MAIN SOURCES CONFIG ──────────────────────────────────────────────────────
const HTML_SOURCES = [
  // ── WORKING SOURCES (confirmed) ──
  { name: 'Wachtell Lipton', url: 'https://www.wlrk.com/careers/', org: 'Wachtell, Lipton, Rosen & Katz', org_type: 'Law Firm', category: 'Legal' },
  { name: 'Simpson Thacher', url: 'https://www.stblaw.com/careers', org: 'Simpson Thacher & Bartlett', org_type: 'Law Firm', category: 'Legal' },
  { name: 'Kirkland Chicago', url: 'https://www.kirkland.com/sitecontent.cfm?contentID=230', org: 'Kirkland & Ellis', org_type: 'Law Firm', category: 'Legal' },
  { name: 'SEO Law Fellowship', url: 'https://www.seo-usa.org/law/', org: 'SEO Law Fellowship', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'PA AG', url: 'https://www.attorneygeneral.gov/about-us/careers/', org: 'Pennsylvania Attorney General', org_type: 'Government', category: 'Government' },
  { name: 'Earthjustice', url: 'https://earthjustice.org/about/jobs', org: 'Earthjustice', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'ACLU', url: 'https://www.aclu.org/careers', org: 'ACLU', org_type: 'Nonprofit / NGO', category: 'Advocacy' },
  { name: 'NAACP LDF', url: 'https://naacpldf.org/about-us/careers/', org: 'NAACP Legal Defense Fund', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'Institute for Justice', url: 'https://ij.org/about-us/careers/', org: 'Institute for Justice', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'NILC', url: 'https://www.nilc.org/about/careers/', org: 'National Immigration Law Center', org_type: 'Nonprofit / NGO', category: 'Advocacy' },
  { name: 'Innocence Project', url: 'https://innocenceproject.org/jobs/', org: 'Innocence Project', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'DOJ Volunteer/Intern', url: 'https://www.justice.gov/legal-careers/volunteer-and-internship', org: 'U.S. Department of Justice', org_type: 'Government', category: 'Government' },
  { name: 'Human Rights Watch', url: 'https://www.hrw.org/jobs', org: 'Human Rights Watch', org_type: 'Nonprofit / NGO', category: 'International' },
  { name: 'EFF', url: 'https://www.eff.org/opportunities', org: 'Electronic Frontier Foundation', org_type: 'Nonprofit / NGO', category: 'Tech-Policy' },
  { name: 'JPMorgan Students', url: 'https://careers.jpmorgan.com/us/en/students/programs', org: 'JPMorgan Chase', org_type: 'Finance', category: 'Finance' },
  { name: 'Goldman Students', url: 'https://www.goldmansachs.com/careers/students/', org: 'Goldman Sachs', org_type: 'Finance', category: 'Finance' },
  { name: 'BlackRock Students', url: 'https://careers.blackrock.com/early-careers/', org: 'BlackRock', org_type: 'Finance', category: 'Finance' },
  { name: 'Morgan Stanley Students', url: 'https://www.morganstanley.com/people-opportunities/students', org: 'Morgan Stanley', org_type: 'Finance', category: 'Finance' },
  { name: 'McKinsey Students', url: 'https://www.mckinsey.com/careers/students', org: 'McKinsey & Company', org_type: 'Consulting', category: 'Consulting' },
  { name: 'BCG Students', url: 'https://careers.bcg.com/students', org: 'Boston Consulting Group', org_type: 'Consulting', category: 'Consulting' },
  { name: 'Southern Poverty Law Center', url: 'https://www.splcenter.org/about/careers', org: 'Southern Poverty Law Center', org_type: 'Nonprofit / NGO', category: 'Advocacy' },
  
  // ── UPDATED/NEW WORKING SOURCES ──
  { name: 'Equal Justice Initiative', url: 'https://eji.org/jobs/', org: 'Equal Justice Initiative', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'Center for Reproductive Rights', url: 'https://reproductiverights.org/about-us/work-with-us/', org: 'Center for Reproductive Rights', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'Lambda Legal', url: 'https://lambdalegal.org/about-us/careers/', org: 'Lambda Legal', org_type: 'Nonprofit / NGO', category: 'Advocacy' },
  { name: 'Public Citizen', url: 'https://www.citizen.org/about/careers/', org: 'Public Citizen', org_type: 'Nonprofit / NGO', category: 'Advocacy' },
  { name: 'Brennan Center', url: 'https://www.brennancenter.org/careers', org: 'Brennan Center for Justice', org_type: 'Research', category: 'Policy' },
  { name: 'CDT', url: 'https://cdt.org/about/jobs/', org: 'Center for Democracy and Technology', org_type: 'Nonprofit / NGO', category: 'Tech-Policy' },
  { name: 'Amnesty USA', url: 'https://www.amnestyusa.org/about/careers/', org: 'Amnesty International USA', org_type: 'Nonprofit / NGO', category: 'International' },
  { name: 'ICRC', url: 'https://www.icrc.org/en/careers', org: 'International Committee of the Red Cross', org_type: 'International', category: 'International' },
  
  // ── NEW THINK TANKS / POLICY ──
  { name: 'Cato Institute', url: 'https://www.cato.org/about/careers', org: 'Cato Institute', org_type: 'Research', category: 'Policy' },
  { name: 'Heritage Foundation', url: 'https://www.heritage.org/about-heritage/careers', org: 'Heritage Foundation', org_type: 'Research', category: 'Policy' },
  { name: 'Center for American Progress', url: 'https://www.americanprogress.org/about/jobs/', org: 'Center for American Progress', org_type: 'Policy', category: 'Policy' },
  { name: 'Pew Research Center', url: 'https://www.pewresearch.org/about/work-at-pew/', org: 'Pew Research Center', org_type: 'Research', category: 'Research' },
  { name: 'ACLU Foundation', url: 'https://www.aclu.org/careers?type=internships', org: 'ACLU Foundation', org_type: 'Nonprofit / NGO', category: 'Legal' },
  { name: 'Vera Institute', url: 'https://www.vera.org/careers', org: 'Vera Institute of Justice', org_type: 'Research', category: 'Legal' },
  { name: 'Justice Policy Institute', url: 'https://justicepolicy.org/about/employment/', org: 'Justice Policy Institute', org_type: 'Nonprofit / NGO', category: 'Policy' },
  { name: 'Drug Policy Alliance', url: 'https://drugpolicy.org/about-us/careers/', org: 'Drug Policy Alliance', org_type: 'Nonprofit / NGO', category: 'Advocacy' },
  
  // ── GOVERNMENT ──
  { name: 'FTC Internships', url: 'https://www.ftc.gov/about-ftc/bureaus-offices/office-general-counsel/legal-honors-internship-program', org: 'Federal Trade Commission', org_type: 'Government', category: 'Government' },
  { name: 'CFPB Internships', url: 'https://www.consumerfinance.gov/about-us/careers/', org: 'Consumer Financial Protection Bureau', org_type: 'Government', category: 'Government' },
  { name: 'State Dept Internships', url: 'https://careers.state.gov/interns-fellows/', org: 'U.S. Department of State', org_type: 'Government', category: 'Government' },
  { name: 'Congressional Research Service', url: 'https://www.loc.gov/crsinfo/opportunities/', org: 'Congressional Research Service', org_type: 'Government', category: 'Government' },
  { name: 'FEC Internships', url: 'https://www.fec.gov/about/careers/internships/', org: 'Federal Election Commission', org_type: 'Government', category: 'Government' },
  { name: 'HHS Internships', url: 'https://www.hhs.gov/careers/internships/index.html', org: 'Dept of Health and Human Services', org_type: 'Government', category: 'Government' },
  
  // ── FINANCE/CONSULTING ──
  { name: 'Deloitte Students', url: 'https://www2.deloitte.com/us/en/pages/careers/articles/join-deloitte-early-career.html', org: 'Deloitte', org_type: 'Consulting', category: 'Consulting' },
  { name: 'Bain Students', url: 'https://www.bain.com/careers/find-a-role/?level=Intern', org: 'Bain & Company', org_type: 'Consulting', category: 'Consulting' },
  { name: 'Citi Students', url: 'https://jobs.citi.com/students', org: 'Citigroup', org_type: 'Finance', category: 'Finance' },
]

// ── EXPORTS ──────────────────────────────────────────────────────────────────
export async function scrapeHTMLSites() {
  const allListings = []
  let totalSources = 0

  // 1. Idealist keyword searches
  const idealistSearches = [
    { keyword: 'law internship undergraduate', category: 'Legal' },
    { keyword: 'policy internship undergraduate', category: 'Policy' },
    { keyword: 'civil rights internship', category: 'Legal' },
    { keyword: 'government internship undergraduate', category: 'Government' },
    { keyword: 'advocacy internship', category: 'Advocacy' },
    { keyword: 'international human rights internship', category: 'International' },
  ]

  for (const { keyword, category } of idealistSearches) {
    const listings = await scrapeIdealist(keyword, category)
    console.log(`  Idealist "${keyword}": ${listings.length} candidates`)
    allListings.push(...listings)
    totalSources++
    await new Promise(r => setTimeout(r, 1500)) // be polite
  }

  // 2. Brookings
  const brookings = await scrapeBrookings()
  console.log(`  Brookings: ${brookings.length} candidates`)
  allListings.push(...brookings)
  totalSources++

  // 3. RAND
  const rand = await scrapeRAND()
  console.log(`  RAND Corporation: ${rand.length} candidates`)
  allListings.push(...rand)
  totalSources++

  // 4. Urban Institute
  const urban = await scrapeUrbanInstitute()
  console.log(`  Urban Institute: ${urban.length} candidates`)
  allListings.push(...urban)
  totalSources++

  // 5. BPC
  const bpc = await scrapeBPC()
  console.log(`  Bipartisan Policy Center: ${bpc.length} candidates`)
  allListings.push(...bpc)
  totalSources++

  // 6. Updated BigLaw with correct URLs (as static entries)
  const cooley = await scrapeCooley()
  const latham = await scrapeLatham()
  allListings.push(...cooley, ...latham)

  // 7. All HTML sources
  for (const source of HTML_SOURCES) {
    const listings = await scrapeSource(source)
    const count = Array.isArray(listings) ? listings.length : 0
    const error = !Array.isArray(listings) ? listings.error : null
    console.log(`  ${source.name}: ${error || `${count} candidates`}`)
    if (Array.isArray(listings)) allListings.push(...listings)
    totalSources++
    await new Promise(r => setTimeout(r, 300)) // rate limit
  }

  console.log(`  Total HTML candidates: ${allListings.length} from ${totalSources} sources`)
  return allListings
}
