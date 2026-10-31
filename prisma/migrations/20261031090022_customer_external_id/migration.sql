-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "customerId" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerId_key" ON "Customer"("customerId");

