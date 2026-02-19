-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Voucher_isArchived_idx" ON "Voucher"("isArchived");
