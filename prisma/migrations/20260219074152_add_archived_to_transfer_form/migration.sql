-- AlterTable
ALTER TABLE "TransferForm" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "TransferForm_isArchived_idx" ON "TransferForm"("isArchived");
