-- Fix: allow kids' shirt sizes (8-16) in addition to XS-XXL.
-- The registration form offers 8,10,12,14,16 but the original CHECK
-- constraint only permitted XS,S,M,L,XL,XXL, causing:
--   new row for relation "participants" violates check constraint
--   "participants_shirt_size_check"
-- Run this in the Supabase SQL editor against the existing database.

ALTER TABLE participants
  DROP CONSTRAINT IF EXISTS participants_shirt_size_check;

ALTER TABLE participants
  ADD CONSTRAINT participants_shirt_size_check
  CHECK (shirt_size IN ('8','10','12','14','16','XS','S','M','L','XL','XXL'));
