# KAP Pre-Law Hub

Private internship and opportunity tracker for Kappa Alpha Pi. Invite-only access. Auto-updates from legal job sources every 6 hours.

---

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database + Auth**: Supabase (free tier)
- **Hosting**: Vercel (free tier)
- **Scraper**: Node.js script via GitHub Actions (free, runs every 6h)

---

## Setup (do this once)

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for it to provision (~1 min)
3. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → click Run
4. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

### 2. Local development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/kap-hub.git
cd kap-hub

# Install dependencies
npm install

# Copy env template
cp .env.example .env.local
# Fill in your Supabase values in .env.local

# Run locally
npm run dev
# Open http://localhost:3000
```

### 3. Create your admin account

1. Go to your Supabase project → **Authentication → Users** → Invite User
2. Enter your email and a password
3. In the **SQL Editor**, run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```
4. You now have admin access: invite management, scraper control, listing moderation

### 4. Deploy to Vercel

1. Push your repo to GitHub (make it **private**)
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. Add all environment variables from `.env.example` in Vercel's Environment Variables settings
4. Deploy — you get a free `your-project.vercel.app` URL

### 5. Set up the scraper (GitHub Actions)

1. In your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add these secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `USAJOBS_API_KEY` — get free at [developer.usajobs.gov](https://developer.usajobs.gov/APIRequest/Index)
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL
3. The scraper runs automatically every 6 hours via `.github/workflows/scrape.yml`
4. You can also trigger it manually in the Actions tab

---

## Inviting Members

1. Sign in as admin → go to **Admin → Invites**
2. Enter a member's email → click **Generate Invite Link**
3. Copy the link and send it to them (iMessage, GroupMe, whatever)
4. They click it, set a password, and they're in. Link expires in 7 days and is single-use.

---

## Adding Scrapers

Each scraper source lives in `scripts/scrape.mjs`. To add a new source:

1. Write an async function that returns an array of listing objects matching the `Listing` type
2. Call `upsertListings()` on the result
3. Call `logScrape()` with the source name and count

The USAJobs API scraper is already working. HTML scrapers for Idealist, ACLU, Earthjustice etc. are the next phase.

---

## Project Structure

```
kap-hub/
├── supabase/
│   └── schema.sql              # Full database schema — run this first
├── scripts/
│   └── scrape.mjs              # Scraper — runs via GitHub Actions
├── .github/workflows/
│   └── scrape.yml              # Cron job config
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx  # Invite-token signup
│   │   ├── dashboard/
│   │   │   ├── layout.tsx       # Auth guard + sidebar
│   │   │   ├── listings/        # Main feed
│   │   │   ├── saved/           # Saved listings
│   │   │   ├── tracker/         # Application tracker
│   │   │   └── submit/          # Member listing submission
│   │   └── admin/
│   │       ├── invites/         # Invite management
│   │       ├── listings/        # Moderate submitted listings
│   │       └── scraper/         # Scraper status
│   ├── components/
│   │   └── layout/Sidebar.tsx
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts        # Browser client
│   │       └── server.ts        # Server client + admin client
│   └── types/
│       └── database.ts          # TypeScript types
├── middleware.ts                 # Auth + admin route protection
├── .env.example                  # Copy to .env.local
└── package.json
```

---

## Cost

| Service | Cost |
|---------|------|
| Supabase | Free (500MB DB, 50k auth users) |
| Vercel | Free (100GB bandwidth) |
| GitHub Actions | Free (2,000 min/month) |
| USAJobs API | Free |
| **Total** | **$0/month** |

The only thing that costs money is if you ever add the Claude API for AI tagging — at current scale that'd be under $2/month.
