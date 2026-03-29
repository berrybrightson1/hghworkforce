-- Optional one-off: clear kiosk device hashes that appear on more than one active employee
-- (e.g. after a bug allowed duplicate bindings). Affected staff must scan the kiosk QR again.
--
-- Supabase → SQL → New query → paste → Run (review in a transaction first if you prefer).

UPDATE "Employee" AS e
SET
  "kioskDeviceTokenHash" = NULL,
  "deviceBoundAt" = NULL
WHERE e."deletedAt" IS NULL
  AND e."kioskDeviceTokenHash" IS NOT NULL
  AND e."kioskDeviceTokenHash" IN (
    SELECT h
    FROM (
      SELECT "kioskDeviceTokenHash" AS h
      FROM "Employee"
      WHERE "deletedAt" IS NULL
        AND "kioskDeviceTokenHash" IS NOT NULL
      GROUP BY "kioskDeviceTokenHash"
      HAVING COUNT(*) > 1
    ) AS dup
  );
