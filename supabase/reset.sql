-- ============================================================
-- KAP Hub · RESET SCRIPT
-- Run this FIRST in Supabase SQL Editor, then run schema.sql
-- ============================================================

-- Drop triggers first
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists listings_updated_at on public.listings;
drop trigger if exists applications_updated_at on public.applications;
drop trigger if exists profiles_updated_at on public.profiles;

-- Drop functions
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

-- Drop tables (order matters for foreign keys)
drop table if exists public.scraper_sources cascade;
drop table if exists public.applications cascade;
drop table if exists public.saved_listings cascade;
drop table if exists public.listings cascade;
drop table if exists public.invites cascade;
drop table if exists public.profiles cascade;

-- Confirm
select 'Reset complete. Now run schema.sql.' as status;
