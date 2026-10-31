-- Track ONU-replacement chains: a new Installation can point at the
-- Installation it replaced for the same customer.
ALTER TABLE "Installation" ADD COLUMN "replacesId" TEXT;

ALTER TABLE "Installation" ADD CONSTRAINT "Installation_replacesId_key" UNIQUE ("replacesId");

ALTER TABLE "Installation" ADD CONSTRAINT "Installation_replacesId_fkey"
  FOREIGN KEY ("replacesId") REFERENCES "Installation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
