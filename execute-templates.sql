-- Execute this script to populate the database with medical specialty templates
-- Make sure you have access to your Supabase database

-- First, let's see what templates currently exist
SELECT name, specialty, is_default, is_public FROM consultation_templates ORDER BY is_default DESC, name ASC;

-- Now execute the populate script
\i populate-medical-templates.sql

-- Verify the results
SELECT name, specialty, is_default, is_public FROM consultation_templates ORDER BY is_default DESC, name ASC; 