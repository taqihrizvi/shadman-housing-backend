/*
  Warnings:

  - The `status` column on the `SaleAgreement` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "SaleAgreement" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "SaleAgreement_status_idx" ON "SaleAgreement"("status");

-- AddForeignKey
ALTER TABLE "SaleAgreement" ADD CONSTRAINT "SaleAgreement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
