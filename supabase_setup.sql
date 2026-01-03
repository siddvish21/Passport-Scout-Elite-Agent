-- Supabase Setup Schema
-- Run this to create the necessary tables and security policies

-- 1. Create Trips Table
CREATE TABLE trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_name TEXT NOT NULL,
    lead_pax TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Passengers Table
CREATE TABLE passengers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    surname TEXT,
    names TEXT,
    passport_number TEXT,
    nationality TEXT,
    dob TEXT,
    expiry TEXT,
    issuing_date TEXT,
    sex TEXT,
    issuing_country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;

-- 4. Allow public access (RLS Policies)
-- Adjust these for production as needed
CREATE POLICY "Enable all for public" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON passengers FOR ALL USING (true) WITH CHECK (true);
