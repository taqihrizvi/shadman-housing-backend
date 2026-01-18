-- AlterEnum
ALTER TYPE "InventoryStatus" ADD VALUE 'TRANSFERRED';

-- AlterTable
ALTER TABLE "SaleAgreement" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "transferId" TEXT;

-- AlterTable
ALTER TABLE "TransferForm" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "newSaleAgreementId" TEXT,
ADD COLUMN     "previousSaleAgreementId" TEXT;

-- CreateIndex
CREATE INDEX "SaleAgreement_isActive_idx" ON "SaleAgreement"("isActive");

-- CreateIndex
CREATE INDEX "TransferForm_plotId_idx" ON "TransferForm"("plotId");
