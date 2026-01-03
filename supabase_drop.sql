-- Supabase Cleanup Script
-- WARNING: Running this will PERMANENTLY DELETE all your trip and passenger data!

-- Drop tables in correct order (dependency first)
DROP TABLE IF EXISTS passengers CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
