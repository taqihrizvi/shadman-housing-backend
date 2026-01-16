-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Voucher_status_idx" ON "Voucher"("status");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
