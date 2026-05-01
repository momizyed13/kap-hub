#!/usr/bin/env node
// scripts/cli/kap.mjs
// Terminal CLI for managing your KAP Hub without touching code.
//
// Usage:
//   node scripts/cli/kap.mjs add-source <name> <url> <category>
//   node scripts/cli/kap.mjs list-sources
//   node scripts/cli/kap.mjs disable-source <name>
//   node scripts/cli/kap.mjs enable-source <name>
//   node scripts/cli/kap.mjs run-scraper          # trigger scraper locally
//   node scripts/cli/kap.mjs purge-old <days>     # remove listings older than N days
//   node scripts/cli/kap.mjs stats                # show DB stats
//   node scripts/cli/kap.mjs invite <email>       # generate invite link

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load env from .env.local if it exists
try {
  const envPath = join(process.cwd(), '.env.local')
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf-8')
    for (const line of env.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim()
    }
  }
} catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const cmd = process.argv[2]
const args = process.argv.slice(3)

const COMMANDS = {

  async 'add-source'() {
    const [name, url, category = 'Legal'] = args
    if (!name || !url) {
      console.error('Usage: add-source <name> <url> [category]')
      process.exit(1)
    }
    const { error } = await supabase.from('scraper_sources').insert({
      name, url, source_type: 'html', org_type: category, active: true,
    })
    if (error) { console.error(error.message); process.exit(1) }
    console.log(`✓ Added source: ${name}`)
  },

  async 'list-sources'() {
    const { data } = await supabase
      .from('scraper_sources')
      .select('*')
      .order('name')
    console.log('\n📋 Scraper Sources\n' + '─'.repeat(80))
    for (const s of data ?? []) {
      const status = s.active ? '🟢' : '🔴'
      const last = s.last_scraped ? new Date(s.last_scraped).toLocaleString() : 'Never'
      console.log(`${status}  ${s.name.padEnd(35)} ${s.source_type.padEnd(6)} ${s.scrape_count.toString().padStart(4)}  ${last}`)
    }
    console.log()
  },

  async 'disable-source'() {
    const name = args.join(' ')
    if (!name) { console.error('Usage: disable-source <name>'); process.exit(1) }
    const { error } = await supabase.from('scraper_sources').update({ active: false }).eq('name', name)
    if (error) { console.error(error.message); process.exit(1) }
    console.log(`✓ Disabled: ${name}`)
  },

  async 'enable-source'() {
    const name = args.join(' ')
    if (!name) { console.error('Usage: enable-source <name>'); process.exit(1) }
    const { error } = await supabase.from('scraper_sources').update({ active: true }).eq('name', name)
    if (error) { console.error(error.message); process.exit(1) }
    console.log(`✓ Enabled: ${name}`)
  },

  async 'run-scraper'() {
    console.log('Running scraper locally...\n')
    const { spawn } = await import('child_process')
    const proc = spawn('node', [join(process.cwd(), 'scripts/scrape.mjs')], { stdio: 'inherit', env: process.env })
    proc.on('exit', (code) => process.exit(code ?? 0))
  },

  async 'purge-old'() {
    const days = parseInt(args[0] || '90')
    const cutoff = new Date(Date.now() - days * 86400000).toISOString()
    const { data, error } = await supabase
      .from('listings')
      .delete()
      .lt('created_at', cutoff)
      .eq('active', true)
      .select('id')
    if (error) { console.error(error.message); process.exit(1) }
    console.log(`✓ Purged ${data?.length ?? 0} listings older than ${days} days`)
  },

  async stats() {
    const [
      { count: totalListings },
      { count: activeListings },
      { count: scrapedListings },
      { count: memberListings },
      { count: users },
      { count: applications },
    ] = await Promise.all([
      supabase.from('listings').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('source', 'scraped'),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('source', 'member'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
    ])

    const { data: byCategory } = await supabase
      .from('listings')
      .select('category')
      .eq('active', true)

    const cats = (byCategory ?? []).reduce((acc, l) => {
      acc[l.category] = (acc[l.category] ?? 0) + 1
      return acc
    }, {})

    console.log('\n📊 KAP Hub Stats')
    console.log('─'.repeat(40))
    console.log(`Total listings:    ${totalListings}`)
    console.log(`  Active:          ${activeListings}`)
    console.log(`  From scrapers:   ${scrapedListings}`)
    console.log(`  From members:    ${memberListings}`)
    console.log(`Users:             ${users}`)
    console.log(`Applications:      ${applications}`)
    console.log('\nBy category:')
    for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat.padEnd(15)} ${count}`)
    }
    console.log()
  },

  async invite() {
    const email = args[0]
    if (!email) { console.error('Usage: invite <email>'); process.exit(1) }
    const { data, error } = await supabase
      .from('invites')
      .insert({ email: email.toLowerCase() })
      .select()
      .single()
    if (error) { console.error(error.message); process.exit(1) }
    const url = process.env.NEXT_PUBLIC_APP_URL || 'https://kap-hub-5.vercel.app'
    console.log(`✓ Invite created for ${email}`)
    console.log(`  Link: ${url}/auth/signup?token=${data.token}`)
    console.log(`  Expires: ${new Date(data.expires_at).toLocaleString()}`)
  },

  async help() {
    console.log(`
KAP Hub CLI

Commands:
  add-source <name> <url> [category]     Add a new scraper source
  list-sources                            Show all sources
  disable-source <name>                   Pause a source
  enable-source <name>                    Resume a source
  run-scraper                             Run scraper locally now
  purge-old <days>                        Remove old listings
  stats                                   Show DB stats
  invite <email>                          Generate an invite link
  help                                    Show this

Examples:
  node scripts/cli/kap.mjs stats
  node scripts/cli/kap.mjs invite friend@illinois.edu
  node scripts/cli/kap.mjs add-source "Wachtell" "https://wlrk.com/careers" Legal
`)
  },
}

const fn = COMMANDS[cmd] || COMMANDS.help
fn().catch((err) => { console.error('Error:', err.message); process.exit(1) })
