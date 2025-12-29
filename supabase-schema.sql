-- ShootFlow Database Schema for Supabase
-- Run this in your Supabase SQL Editor to create the tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shoots table
CREATE TABLE IF NOT EXISTS shoots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT,
  duration TEXT,
  location TEXT,
  equipment JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'new_request',
  requestor JSONB,
  vendor_quote JSONB,
  approved BOOLEAN DEFAULT FALSE,
  approved_amount DECIMAL,
  invoice_file JSONB,
  paid BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  approval_email TEXT,
  cancellation_reason TEXT,
  activities JSONB DEFAULT '[]'::jsonb,
  email_thread_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shoot_date TIMESTAMP WITH TIME ZONE,
  request_group_id TEXT,
  is_multi_shoot BOOLEAN DEFAULT FALSE,
  multi_shoot_index INTEGER,
  total_shoots_in_request INTEGER
);

-- Catalog items table
CREATE TABLE IF NOT EXISTS catalog_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  daily_rate DECIMAL NOT NULL,
  category TEXT NOT NULL,
  last_updated TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shoots_status ON shoots(status);
CREATE INDEX IF NOT EXISTS idx_shoots_created_at ON shoots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoots_request_group_id ON shoots(request_group_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);

-- Enable Row Level Security (RLS)
ALTER TABLE shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can customize these for your auth system)
-- For now, allowing all authenticated and anonymous users to access data
CREATE POLICY "Allow all operations on shoots" ON shoots
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on catalog_items" ON catalog_items
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default catalog items (equipment list)
INSERT INTO catalog_items (id, name, daily_rate, category, last_updated) VALUES
  ('1', 'Camera Sony A7S3', 1500, 'Camera', 'Dec 10'),
  ('2', 'Camera Sony A7siii', 1500, 'Camera', 'Dec 10'),
  ('3', 'Camera Sony Fx3', 1800, 'Camera', 'Dec 10'),
  ('4', 'Camera Sony A7iv', 1800, 'Camera', 'Dec 10'),
  ('5', 'Camera Sony A74', 1800, 'Camera', 'Dec 10'),
  ('6', 'Sony FX3', 1800, 'Camera', 'Dec 10'),
  ('7', 'GoPro Hero 13', 1500, 'Camera', 'Dec 10'),
  ('8', 'Gopro 13 with Underwater Housing', 1800, 'Camera', 'Dec 10'),
  ('9', 'DJI Action Camera with Mounts', 1800, 'Camera', 'Dec 10'),
  ('10', 'Gimbal Ronin RS4', 1500, 'Camera', 'Dec 10'),
  ('11', 'RS3 Pro Gimbal', 1500, 'Camera', 'Dec 10'),
  ('12', 'ND Filter Tiffen', 500, 'Camera', 'Dec 10'),
  ('19', 'Sony Lens 24-70mm GM', 1200, 'Lens', 'Dec 10'),
  ('20', 'Sony Lens 24-70mm GM2', 1200, 'Lens', 'Dec 10'),
  ('21', 'Sony Lens 28-70mm GM', 1500, 'Lens', 'Dec 10'),
  ('22', 'Sony Lens 16-35mm GM', 1000, 'Lens', 'Dec 10'),
  ('23', 'Sony Lens 16-35mm GM II', 1500, 'Lens', 'Dec 10'),
  ('24', 'Sony Lens 70-200mm GM', 1200, 'Lens', 'Dec 10'),
  ('25', 'Sony Lens 70-200mm GM II', 1500, 'Lens', 'Dec 10'),
  ('41', 'Amaran 200x with 65mm Softbox', 1200, 'Light', 'Dec 10'),
  ('42', 'Amaran 200x with 45mm Softbox', 1200, 'Light', 'Dec 10'),
  ('43', 'Amaran 200x with Lantern', 1700, 'Light', 'Dec 10'),
  ('44', 'Amaran 200x', 800, 'Light', 'Dec 10'),
  ('45', 'Amaran 300c with 90mm Softbox', 1500, 'Light', 'Dec 10'),
  ('79', 'Terris Tripod', 400, 'Tripod', 'Dec 10'),
  ('80', 'Photo Tripod', 500, 'Tripod', 'Dec 10'),
  ('81', 'Slider 4ft', 1000, 'Tripod', 'Dec 10'),
  ('85', 'Sennheiser G4 Lapel Mic', 500, 'Audio', 'Dec 10'),
  ('86', 'Rode/Hollyland Mic', 500, 'Audio', 'Dec 10'),
  ('87', 'Wireless Cordless Mic', 500, 'Audio', 'Dec 10'),
  ('88', 'Zoom H6 Recorder', 800, 'Audio', 'Dec 10'),
  ('96', 'Accessories Kit (C-Stand, Clamps, Grips)', 2500, 'Small Equipments', 'Dec 10'),
  ('104', 'Shogun Monitor with Stand', 1500, 'Extra', 'Dec 10'),
  ('105', 'Ninja V Monitor', 800, 'Extra', 'Dec 10'),
  ('122', 'Camera Assistant', 2000, 'Assistant', 'Dec 10'),
  ('123', 'Assistant (General)', 2000, 'Assistant', 'Dec 10'),
  ('124', 'Gaffer', 4000, 'Gaffer', 'Dec 10'),
  ('131', 'Transportation (Local)', 2000, 'Transport', 'Dec 10'),
  ('132', 'Transportation (Outstation)', 5000, 'Transport', 'Dec 10')
ON CONFLICT (id) DO NOTHING;







