// scripts/scrapers/html-sites.mjs
// MAJOR EXPANSION: 60+ sources covering BigLaw 1L/undergrad programs,
// pipeline programs (SEO, CLEO), state attorneys general, top advocacy orgs,
// finance compliance, consulting, tech policy, and international.

import * as cheerio from 'cheerio'

const SITES = [
  // ============================================================
  // BIGLAW DIVERSITY / 1L / UNDERGRAD PIPELINE PROGRAMS
  // These are the biggest source of structured undergrad-legal opportunities.
  // ============================================================
  { name: 'Latham & Watkins Diversity', url: 'https://www.lw.com/en/careers/diversity-equity-inclusion', org: 'Latham & Watkins', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Skadden Honors Program', url: 'https://www.skadden.com/careers/students', org: 'Skadden', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Kirkland & Ellis Students', url: 'https://www.kirkland.com/careers/students', org: 'Kirkland & Ellis', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Sidley Austin Pipeline', url: 'https://www.sidley.com/en/careers/diversity-equity-inclusion', org: 'Sidley Austin', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Mayer Brown Diversity', url: 'https://www.mayerbrown.com/en/careers/diversity', org: 'Mayer Brown', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Jones Day Pipeline', url: 'https://www.jonesday.com/en/careers/students', org: 'Jones Day', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Sullivan & Cromwell', url: 'https://www.sullcrom.com/careers-students', org: 'Sullivan & Cromwell', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Davis Polk Diversity', url: 'https://www.davispolk.com/careers/diversity-and-inclusion', org: 'Davis Polk', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Cravath Diversity', url: 'https://www.cravath.com/careers-pipeline-program.html', org: 'Cravath, Swaine & Moore', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Paul Weiss Diversity', url: 'https://www.paulweiss.com/careers/diversity-and-inclusion', org: 'Paul, Weiss', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Wachtell Lipton', url: 'https://www.wlrk.com/careers', org: 'Wachtell, Lipton, Rosen & Katz', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Simpson Thacher', url: 'https://www.stblaw.com/careers/students', org: 'Simpson Thacher', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Cleary Gottlieb', url: 'https://www.clearygottlieb.com/careers/students', org: 'Cleary Gottlieb', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'White & Case Pipeline', url: 'https://www.whitecase.com/careers/students', org: 'White & Case', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Gibson Dunn', url: 'https://www.gibsondunn.com/careers/students', org: 'Gibson Dunn', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Morrison Foerster', url: 'https://www.mofo.com/careers/students', org: 'Morrison & Foerster', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },
  { name: 'Wilson Sonsini', url: 'https://www.wsgr.com/en/careers/students.html', org: 'Wilson Sonsini', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw / Tech' },
  { name: 'Cooley LLP', url: 'https://www.cooley.com/careers/students', org: 'Cooley', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw / Tech' },
  { name: 'Akin Gump', url: 'https://www.akingump.com/en/careers/students', org: 'Akin Gump', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw' },

  // Chicago-specific (KAP is Illinois-based)
  { name: 'Winston & Strawn', url: 'https://www.winston.com/en/careers/students', org: 'Winston & Strawn', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw - Chicago' },
  { name: 'Mayer Brown Chicago', url: 'https://www.mayerbrown.com/en/careers/students', org: 'Mayer Brown', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw - Chicago' },
  { name: 'Kirkland Chicago', url: 'https://www.kirkland.com/careers', org: 'Kirkland & Ellis', org_type: 'Law Firm', category: 'Legal', practice_area_default: 'BigLaw - Chicago' },

  // ============================================================
  // PIPELINE PROGRAMS (the big aggregators for undergrad pre-law)
  // ============================================================
  { name: 'SEO Law Fellowship', url: 'https://www.seo-usa.org/career/law/', org: 'Sponsors for Educational Opportunity', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Pipeline Program' },
  { name: 'CLEO College Scholars', url: 'https://cleoinc.org/programs/college-scholars-program/', org: 'CLEO', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Pipeline Program' },
  { name: 'AccessLex Programs', url: 'https://www.accesslex.org/student-resources', org: 'AccessLex Institute', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Pre-Law Pipeline' },
  { name: 'PLUS (Pre-Law Undergraduate Scholars)', url: 'https://www.lsac.org/discover-law/diversity-law-school/plus-programs', org: 'LSAC', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Pre-Law Pipeline' },
  { name: 'CCWT Pre-Law Programs', url: 'https://ccwt.wceruw.org/research/pre-law', org: 'CCWT', org_type: 'Research', category: 'Legal', practice_area_default: 'Pre-Law Pipeline' },
  { name: 'Marshall-Brennan Project', url: 'https://www.american.edu/spa/marshall-brennan/', org: 'Marshall-Brennan Constitutional Literacy Project', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Constitutional Education' },

  // ============================================================
  // STATE ATTORNEYS GENERAL (huge undergrad pipeline)
  // ============================================================
  { name: 'NY AG Internships', url: 'https://ag.ny.gov/employment-opportunities/internships', org: 'New York Attorney General', org_type: 'Government', category: 'Government', practice_area_default: 'State AG' },
  { name: 'CA AG Internships', url: 'https://oag.ca.gov/careers/internships', org: 'California Attorney General', org_type: 'Government', category: 'Government', practice_area_default: 'State AG' },
  { name: 'TX AG Internships', url: 'https://www.texasattorneygeneral.gov/about-office/career-information', org: 'Texas Attorney General', org_type: 'Government', category: 'Government', practice_area_default: 'State AG' },
  { name: 'IL AG Internships', url: 'https://illinoisattorneygeneral.gov/about/careers/', org: 'Illinois Attorney General', org_type: 'Government', category: 'Government', practice_area_default: 'State AG' },
  { name: 'FL AG', url: 'https://myfloridalegal.com/careers', org: 'Florida Attorney General', org_type: 'Government', category: 'Government', practice_area_default: 'State AG' },
  { name: 'PA AG', url: 'https://www.attorneygeneral.gov/our-office/employment/', org: 'Pennsylvania Attorney General', org_type: 'Government', category: 'Government', practice_area_default: 'State AG' },

  // ============================================================
  // NONPROFITS / ADVOCACY (kept from v2, expanded)
  // ============================================================
  { name: 'Earthjustice', url: 'https://earthjustice.org/about/jobs', org: 'Earthjustice', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Environmental Law' },
  { name: 'ACLU', url: 'https://www.aclu.org/careers', org: 'ACLU', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Civil Rights' },
  { name: 'NAACP LDF', url: 'https://naacpldf.org/about-us/careers/', org: 'NAACP Legal Defense Fund', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Civil Rights' },
  { name: 'Brennan Center', url: 'https://www.brennancenter.org/about/careers', org: 'Brennan Center for Justice', org_type: 'Research', category: 'Legal', practice_area_default: 'Democracy' },
  { name: 'Lambda Legal', url: 'https://lambdalegal.org/about/jobs', org: 'Lambda Legal', org_type: 'Advocacy', category: 'Legal', practice_area_default: 'LGBTQ+ Rights' },
  { name: 'Public Citizen', url: 'https://www.citizen.org/about/careers/', org: 'Public Citizen', org_type: 'Advocacy', category: 'Legal', practice_area_default: 'Consumer Advocacy' },
  { name: 'Institute for Justice', url: 'https://ij.org/about/careers/', org: 'Institute for Justice', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Constitutional Law' },
  { name: 'NILC', url: 'https://www.nilc.org/about/jobs/', org: 'National Immigration Law Center', org_type: 'Advocacy', category: 'Legal', practice_area_default: 'Immigration Law' },
  { name: 'Innocence Project', url: 'https://innocenceproject.org/jobs/', org: 'Innocence Project', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Criminal Justice' },
  { name: 'Equal Justice Initiative', url: 'https://eji.org/careers/', org: 'Equal Justice Initiative', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Criminal Justice' },
  { name: 'Southern Poverty Law Center', url: 'https://www.splcenter.org/jobs', org: 'Southern Poverty Law Center', org_type: 'Nonprofit / NGO', category: 'Legal', practice_area_default: 'Civil Rights' },
  { name: 'Center for Reproductive Rights', url: 'https://reproductiverights.org/about-us/job-opportunities/', org: 'Center for Reproductive Rights', org_type: 'Advocacy', category: 'Legal', practice_area_default: 'Reproductive Rights' },

  // ============================================================
  // GOVERNMENT (federal agencies beyond USAJobs)
  // ============================================================
  { name: 'Federal Reserve Internships', url: 'https://www.federalreserve.gov/careers/student-internship-program.htm', org: 'Federal Reserve Board', org_type: 'Government', category: 'Government', practice_area_default: 'Banking Regulation' },
  { name: 'SEC Student Programs', url: 'https://www.sec.gov/jobs/students-recent-graduates', org: 'SEC', org_type: 'Government', category: 'Government', practice_area_default: 'Securities' },
  { name: 'Federal Courts Internships', url: 'https://www.uscourts.gov/careers/internships', org: 'U.S. Federal Courts', org_type: 'Judicial', category: 'Government', practice_area_default: 'Judicial' },
  { name: 'EPA Internships', url: 'https://www.epa.gov/careers/student-internships-pathways-program', org: 'EPA', org_type: 'Government', category: 'Government', practice_area_default: 'Environmental Regulation' },
  { name: 'DOJ Volunteer/Intern', url: 'https://www.justice.gov/legal-careers/volunteer-legal-internships', org: 'U.S. Department of Justice', org_type: 'Government', category: 'Government', practice_area_default: 'Federal Law Enforcement' },

  // ============================================================
  // INTERNATIONAL
  // ============================================================
  { name: 'Human Rights Watch', url: 'https://www.hrw.org/careers', org: 'Human Rights Watch', org_type: 'International', category: 'International', practice_area_default: 'Human Rights' },
  { name: 'Amnesty USA', url: 'https://www.amnestyusa.org/about-us/jobs-and-internships/', org: 'Amnesty International USA', org_type: 'International', category: 'International', practice_area_default: 'Human Rights' },
  { name: 'ICRC', url: 'https://www.icrc.org/en/careers', org: 'ICRC', org_type: 'International', category: 'International', practice_area_default: 'Humanitarian Law' },

  // ============================================================
  // TECH POLICY
  // ============================================================
  { name: 'EFF', url: 'https://www.eff.org/about/opportunities/jobs', org: 'Electronic Frontier Foundation', org_type: 'Advocacy', category: 'Tech-Policy', practice_area_default: 'Digital Rights' },
  { name: 'CDT', url: 'https://cdt.org/about/jobs/', org: 'Center for Democracy & Technology', org_type: 'Advocacy', category: 'Tech-Policy', practice_area_default: 'Tech Policy' },

  // ============================================================
  // FINANCE (undergrad programs only - tagged Finance)
  // ============================================================
  { name: 'JPMorgan Students', url: 'https://careers.jpmorgan.com/us/en/students', org: 'JPMorgan Chase', org_type: 'Finance', category: 'Finance', practice_area_default: 'Investment Banking' },
  { name: 'Goldman Students', url: 'https://www.goldmansachs.com/careers/students/', org: 'Goldman Sachs', org_type: 'Finance', category: 'Finance', practice_area_default: 'Investment Banking' },
  { name: 'BlackRock Students', url: 'https://careers.blackrock.com/early-careers/', org: 'BlackRock', org_type: 'Finance', category: 'Finance', practice_area_default: 'Asset Management' },
  { name: 'Morgan Stanley Students', url: 'https://www.morganstanley.com/people/students-graduates', org: 'Morgan Stanley', org_type: 'Finance', category: 'Finance', practice_area_default: 'Investment Banking' },
  { name: 'Citi Students', url: 'https://www.citigroup.com/global/careers/students-and-graduates', org: 'Citigroup', org_type: 'Finance', category: 'Finance', practice_area_default: 'Investment Banking' },

  // ============================================================
  // CONSULTING (undergrad programs)
  // ============================================================
  { name: 'McKinsey Students', url: 'https://www.mckinsey.com/careers/students', org: 'McKinsey & Company', org_type: 'Consulting', category: 'Consulting', practice_area_default: 'Strategy' },
  { name: 'Deloitte Students', url: 'https://www2.deloitte.com/us/en/pages/careers/topics/students.html', org: 'Deloitte', org_type: 'Consulting', category: 'Consulting', practice_area_default: 'Risk Advisory' },
  { name: 'BCG Students', url: 'https://careers.bcg.com/students', org: 'Boston Consulting Group', org_type: 'Consulting', category: 'Consulting', practice_area_default: 'Strategy' },
  { name: 'Bain Students', url: 'https://www.bain.com/careers/students/', org: 'Bain & Company', org_type: 'Consulting', category: 'Consulting', practice_area_default: 'Strategy' },
]

const KEYWORDS = [
  'intern', 'fellow', 'paralegal', 'clerk', 'analyst', 'assistant', 'associate', 'student',
  'trainee', 'apprentice', 'scholar', 'pipeline', 'diversity program', 'undergraduate',
  '1l', 'first-year', 'pre-law', 'summer program', 'externship', 'shadow', 'mentorship',
]

function looksLikeJob(text) {
  if (text.length < 6 || text.length > 200) return false
  const lower = text.toLowerCase()
  return KEYWORDS.some((k) => lower.includes(k))
}

async function scrapeSite(site) {
  const results = []
  try {
    const res = await fetch(site.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KAPPreLawHub/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      console.warn(`  ${site.name}: HTTP ${res.status}`)
      return results
    }

    const html = await res.text()
    const $ = cheerio.load(html)
    const candidates = new Map()

    $('a').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim().replace(/\s+/g, ' ')
      let href = $el.attr('href') ?? ''

      if (!looksLikeJob(text)) return
      if (candidates.has(text)) return

      try {
        const u = new URL(site.url)
        if (href.startsWith('/')) href = `${u.origin}${href}`
        else if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
        else if (!href.startsWith('http')) href = new URL(href, site.url).toString()
      } catch { return }

      candidates.set(text, href)
    })

    for (const [title, href] of candidates) {
      results.push({
        title,
        organization: site.org,
        org_type: site.org_type,
        category: site.category,
        pay_type: site.category === 'Finance' || site.category === 'Consulting' ? 'Paid' : 'Stipend',
        location: 'Various',
        remote: false,
        deadline: null,
        rolling: true,
        apply_url: href,
        description: null,
        practice_area: site.practice_area_default,
        undergrad_ok: true,
        source: 'scraped',
        verified: false,
        external_id: `html_${site.name.toLowerCase().replace(/\W/g, '_')}_${Buffer.from(title).toString('base64').slice(0, 20)}`,
        source_url: site.url,
      })
    }
  } catch (err) {
    console.error(`  ${site.name}: ${err.message}`)
  }
  return results
}

export async function scrapeHTMLSites() {
  const all = []
  // Process 8 sites in parallel for speed
  for (let i = 0; i < SITES.length; i += 8) {
    const batch = SITES.slice(i, i + 8)
    const batchResults = await Promise.all(batch.map(scrapeSite))
    for (let j = 0; j < batch.length; j++) {
      if (batchResults[j].length) {
        console.log(`  ${batch[j].name}: ${batchResults[j].length} candidates`)
      }
      all.push(...batchResults[j])
    }
  }
  console.log(`\n  Total HTML candidates: ${all.length} from ${SITES.length} sources`)
  return all
}
