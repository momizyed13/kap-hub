// src/types/database.ts
// These types mirror the Supabase schema exactly.
// Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID

export type OrgType = 'Law Firm' | 'Government' | 'Nonprofit / NGO' | 'Policy' | 'Research' | 'Advocacy' | 'Judicial' | 'Other'
export type PayType = 'Paid' | 'Unpaid' | 'Stipend'
export type AppStatus = 'Saved' | 'Applied' | 'Phone Screen' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn'
export type UserRole = 'member' | 'officer' | 'admin'
export type SourceType = 'member' | 'scraped' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  grad_year: number | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Listing {
  id: string
  title: string
  organization: string
  org_type: OrgType
  pay_type: PayType
  location: string
  remote: boolean
  deadline: string | null
  rolling: boolean
  apply_url: string
  description: string | null
  practice_area: string | null
  undergrad_ok: boolean
  class_years: string[] | null
  source: SourceType
  verified: boolean
  active: boolean
  submitted_by: string | null
  created_at: string
  updated_at: string
  external_id: string | null
  source_url: string | null
}

export interface SavedListing {
  id: string
  user_id: string
  listing_id: string
  created_at: string
  listing?: Listing
}

export interface Application {
  id: string
  user_id: string
  listing_id: string | null
  custom_title: string | null
  custom_org: string | null
  status: AppStatus
  applied_date: string | null
  deadline: string | null
  notes: string | null
  created_at: string
  updated_at: string
  listing?: Listing
}

export interface Invite {
  id: string
  email: string
  token: string
  invited_by: string | null
  used: boolean
  expires_at: string
  created_at: string
}

export interface ScraperSource {
  id: string
  name: string
  url: string
  source_type: 'api' | 'html' | 'rss'
  org_type: string | null
  active: boolean
  last_scraped: string | null
  scrape_count: number
  created_at: string
}

// Supabase Database type wrapper
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      listings: { Row: Listing; Insert: Partial<Listing>; Update: Partial<Listing> }
      saved_listings: { Row: SavedListing; Insert: Partial<SavedListing>; Update: Partial<SavedListing> }
      applications: { Row: Application; Insert: Partial<Application>; Update: Partial<Application> }
      invites: { Row: Invite; Insert: Partial<Invite>; Update: Partial<Invite> }
      scraper_sources: { Row: ScraperSource; Insert: Partial<ScraperSource>; Update: Partial<ScraperSource> }
    }
  }
}
