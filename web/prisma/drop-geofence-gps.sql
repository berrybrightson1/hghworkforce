-- Run in Supabase → SQL after deploying code that removes geofence/GPS fields.
-- Safe to run once; uses IF EXISTS.

ALTER TABLE "Company" DROP COLUMN IF EXISTS "officeLat";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "officeLng";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "geofenceRadius";

ALTER TABLE "CheckIn" DROP COLUMN IF EXISTS "clockInLat";
ALTER TABLE "CheckIn" DROP COLUMN IF EXISTS "clockInLng";
ALTER TABLE "CheckIn" DROP COLUMN IF EXISTS "clockOutLat";
ALTER TABLE "CheckIn" DROP COLUMN IF EXISTS "clockOutLng";
ALTER TABLE "CheckIn" DROP COLUMN IF EXISTS "outsideGeofence";
