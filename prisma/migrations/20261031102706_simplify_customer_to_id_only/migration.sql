-- Add the new snapshot column first
ALTER TABLE "Installation" ADD COLUMN "customerIdText" TEXT;

-- Preserve existing customerName data into the new field before dropping it
UPDATE "Installation" SET "customerIdText" = "customerName" WHERE "customerName" IS NOT NULL;

-- Now drop the old free-text customer fields
ALTER TABLE "Installation" DROP COLUMN "customerAddress",
DROP COLUMN "customerName";

ALTER TABLE "Customer" DROP COLUMN "address",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "notes",
DROP COLUMN "phone",
ALTER COLUMN "customerId" SET NOT NULL;
