-- Add station 4 = "turnaround point" (נקודת הסתובבות).
-- A run-course checkpoint where a judge marks each runner passing, so HQ knows
-- who reached the turnaround and started heading back. It is a checkpoint only
-- and does NOT affect swim/bike/run result times (those use stations 1-3).
-- Run this in the Supabase SQL editor against the existing database.

ALTER TABLE timing_records DROP CONSTRAINT IF EXISTS timing_records_station_check;
ALTER TABLE timing_records
  ADD CONSTRAINT timing_records_station_check CHECK (station IN (1,2,3,4));

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_assigned_station_check;
ALTER TABLE app_users
  ADD CONSTRAINT app_users_assigned_station_check CHECK (assigned_station IN (1,2,3,4));
