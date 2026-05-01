-- ============================================================
-- KAP Pre-Law Hub · Supabase Schema
-- Run this entire file in your Supabase SQL editor
-- ============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text unique not null,
  full_name    text,
  grad_year    int,
  role         text not null default 'member' check (role in ('member', 'admin', 'officer')),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INVITES (invite-only access control)
-- ============================================================
create table public.invites (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  token       text unique not null default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references public.profiles(id),
  used        boolean not null default false,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

alter table public.invites enable row level security;

create policy "Admins can manage invites"
  on public.invites for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','officer'))
  );

-- ============================================================
-- LISTINGS
-- ============================================================
create table public.listings (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  organization  text not null,
  org_type      text not null check (org_type in (
                  'Law Firm', 'Government', 'Nonprofit / NGO',
                  'Policy', 'Research', 'Advocacy', 'Judicial', 'Other'
                )),
  pay_type      text not null check (pay_type in ('Paid', 'Unpaid', 'Stipend')),
  location      text not null,
  remote        boolean not null default false,
  deadline      date,
  rolling       boolean not null default false,
  apply_url     text not null,
  description   text,
  practice_area text,                     -- e.g. "Civil Rights", "Environmental Law"
  undergrad_ok  boolean not null default true,
  class_years   text[],                   -- e.g. ['freshman','sophomore','junior','senior']
  source        text not null default 'member' check (source in ('member','scraped','admin')),
  verified      boolean not null default false,
  active        boolean not null default true,
  submitted_by  uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- for scraped listings
  external_id   text,
  source_url    text
);

alter table public.listings enable row level security;

create policy "Authenticated users can view active listings"
  on public.listings for select
  using (auth.role() = 'authenticated' and active = true);

create policy "Members can submit listings"
  on public.listings for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update/delete any listing"
  on public.listings for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','officer'))
  );

create policy "Admins can delete listings"
  on public.listings for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','officer'))
  );

-- Full text search index
create index listings_fts_idx on public.listings
  using gin(to_tsvector('english', title || ' ' || organization || ' ' || coalesce(description,'') || ' ' || coalesce(practice_area,'')));

-- ============================================================
-- SAVED LISTINGS
-- ============================================================
create table public.saved_listings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  listing_id  uuid references public.listings(id) on delete cascade not null,
  created_at  timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

create policy "Users manage their own saved listings"
  on public.saved_listings for all using (auth.uid() = user_id);

-- ============================================================
-- APPLICATION TRACKER
-- ============================================================
create table public.applications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade not null,
  listing_id    uuid references public.listings(id) on delete set null,
  -- allow tracking external apps not in our DB
  custom_title  text,
  custom_org    text,
  status        text not null default 'Saved' check (status in (
                  'Saved', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected', 'Withdrawn'
                )),
  applied_date  date,
  deadline      date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "Users manage their own applications"
  on public.applications for all using (auth.uid() = user_id);

-- ============================================================
-- SCRAPER SOURCES (admin-managed list of URLs to scrape)
-- ============================================================
create table public.scraper_sources (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  url           text not null,
  source_type   text not null check (source_type in ('api','html','rss')),
  org_type      text,
  active        boolean not null default true,
  last_scraped  timestamptz,
  scrape_count  int not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.scraper_sources enable row level security;

create policy "Admins manage scraper sources"
  on public.scraper_sources for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','officer'))
  );

-- ============================================================
-- SEED: SCRAPER SOURCES
-- ============================================================
insert into public.scraper_sources (name, url, source_type, org_type) values
  ('USAJobs API',            'https://data.usajobs.gov/api/search',                    'api',  'Government'),
  ('Idealist',               'https://www.idealist.org/en/jobs?q=legal+intern',         'html', 'Nonprofit / NGO'),
  ('Idealist Policy',        'https://www.idealist.org/en/jobs?q=policy+intern',         'html', 'Policy'),
  ('Earthjustice Careers',   'https://earthjustice.org/about/jobs',                      'html', 'Nonprofit / NGO'),
  ('ACLU Careers',           'https://www.aclu.org/careers',                              'html', 'Nonprofit / NGO'),
  ('NAACP LDF',              'https://naacpldf.org/about-us/careers',                     'html', 'Nonprofit / NGO'),
  ('Human Rights Watch',     'https://www.hrw.org/careers',                               'html', 'Advocacy'),
  ('Lambda Legal',           'https://lambdalegal.org/about/jobs',                        'html', 'Advocacy'),
  ('DOJ Volunteer/Intern',   'https://www.justice.gov/legal-careers/internships-volunteers','html','Government'),
  ('FTC Honors Paralegal',   'https://www.ftc.gov/about-ftc/careers-ftc',                 'html', 'Government'),
  ('EPA Internships',        'https://www.epa.gov/careers/student-internships',           'html', 'Government'),
  ('NILC Careers',           'https://www.nilc.org/about/jobs',                           'html', 'Advocacy'),
  ('Brennan Center',         'https://www.brennancenter.org/careers',                     'html', 'Research'),
  ('Institute for Justice',  'https://ij.org/about/careers',                              'html', 'Nonprofit / NGO'),
  ('Public Citizen',         'https://www.citizen.org/about/careers',                     'html', 'Advocacy');

-- ============================================================
-- SEED: SAMPLE LISTINGS
-- ============================================================
insert into public.listings (title, organization, org_type, pay_type, location, remote, deadline, apply_url, description, practice_area, undergrad_ok, source, verified) values
(
  'Legal Intern', 'ACLU National', 'Nonprofit / NGO', 'Unpaid',
  'New York, NY', false, '2025-08-01',
  'https://www.aclu.org/careers',
  'Research and support litigation in the ACLU''s national legal department. Assist attorneys on civil rights, free speech, and voting rights cases. Undergrads with demonstrated interest in civil rights law accepted.',
  'Civil Rights & Liberties', true, 'admin', true
),
(
  'DOJ Honors Paralegal', 'U.S. Department of Justice', 'Government', 'Paid',
  'Washington, D.C.', false, '2025-07-15',
  'https://www.justice.gov/legal-careers/internships-volunteers',
  'Work alongside DOJ attorneys in the Criminal Division. Legal research, document review, and case preparation. Open to undergraduates in their junior or senior year.',
  'Federal Criminal Law', true, 'admin', true
),
(
  'Environmental Justice Fellow', 'Earthjustice', 'Nonprofit / NGO', 'Stipend',
  'Denver, CO', true, '2025-09-01',
  'https://earthjustice.org/about/jobs',
  'Support Earthjustice attorneys on landmark environmental cases. Research regulatory compliance, draft memos, and assist with community outreach. Ideal for students passionate about climate and environmental justice.',
  'Environmental Law', true, 'admin', true
),
(
  'Legislative Research Intern', 'U.S. Senate Judiciary Committee', 'Policy', 'Unpaid',
  'Washington, D.C.', false, '2025-06-30',
  'https://www.senate.gov/visiting/internships.htm',
  'Assist committee staff with research on pending legislation, draft briefing materials, and attend hearings. Exceptional for students interested in the law-policy intersection.',
  'Legislative & Policy', true, 'admin', true
),
(
  'Public Defender Intern', 'Cook County Public Defender', 'Government', 'Unpaid',
  'Chicago, IL', false, '2025-08-15',
  'https://www.cookcountyil.gov/agency/office-public-defender',
  'Shadow public defenders in felony and misdemeanor courtrooms. Client interviews, legal research, and case preparation. One of the most hands-on undergrad legal experiences in Illinois.',
  'Criminal Defense', true, 'admin', true
),
(
  'Immigration Advocacy Intern', 'National Immigration Law Center', 'Advocacy', 'Stipend',
  'Los Angeles, CA', true, '2025-07-20',
  'https://www.nilc.org/about/jobs',
  'Research immigration policy, draft advocacy materials, and support the legal team. NILC focuses on low-income immigrants and has a track record of landmark Supreme Court cases.',
  'Immigration Law', true, 'admin', true
),
(
  'Pre-Law Research Assistant', 'Northwestern Pritzker School of Law', 'Research', 'Paid',
  'Evanston, IL', false, '2025-07-01',
  'https://www.law.northwestern.edu',
  'Assist law professors with research across constitutional law and administrative law. Prior coursework in political science or philosophy preferred.',
  'Legal Scholarship', true, 'admin', true
),
(
  'Civil Rights Clinic Intern', 'NAACP Legal Defense Fund', 'Nonprofit / NGO', 'Unpaid',
  'New York, NY', true, '2025-09-15',
  'https://naacpldf.org/about-us/careers',
  'Work with LDF''s legal team on voting rights, educational equity, and criminal justice cases. Strong writing skills required.',
  'Civil Rights', true, 'admin', true
),
(
  'Honors Paralegal Program', 'Federal Trade Commission', 'Government', 'Paid',
  'Washington, D.C.', false, '2025-07-31',
  'https://www.ftc.gov/about-ftc/careers-ftc',
  'Two-year paralegal program for recent graduates and seniors. Work on antitrust and consumer protection cases. Competitive salary and a direct pipeline to top law schools.',
  'Antitrust & Consumer Protection', true, 'admin', true
),
(
  'Climate Law Fellow', 'Center for Biological Diversity', 'Advocacy', 'Stipend',
  'Tucson, AZ', true, '2025-08-30',
  'https://biologicaldiversity.org/about/jobs',
  'Research climate litigation strategies, draft memos for attorneys, and support campaigns to protect endangered species via legal action. Remote-friendly.',
  'Environmental & Climate Law', true, 'admin', true
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger listings_updated_at before update on public.listings
  for each row execute procedure public.set_updated_at();

create trigger applications_updated_at before update on public.applications
  for each row execute procedure public.set_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
