-- AlterTable
ALTER TABLE "SaleAgreement" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SaleAgreement_isArchived_idx" ON "SaleAgreement"("isArchived");
