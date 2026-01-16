/*
  Warnings:

  - The values [5_MARLA,7_MARLA,10_MARLA,1_KANAL,2_KANAL] on the enum `PlotSize` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "PlotSize_new" AS ENUM ('FIVE_MARLA', 'SEVEN_MARLA', 'TEN_MARLA', 'ONE_KANAL', 'TWO_KANAL');
ALTER TABLE "Inventory" ALTER COLUMN "size" TYPE "PlotSize_new" USING ("size"::text::"PlotSize_new");
ALTER TYPE "PlotSize" RENAME TO "PlotSize_old";
ALTER TYPE "PlotSize_new" RENAME TO "PlotSize";
DROP TYPE "PlotSize_old";
COMMIT;

-- AlterTable
ALTER TABLE "Biyana" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signature" TEXT;

-- CreateIndex
CREATE INDEX "Biyana_status_idx" ON "Biyana"("status");

-- AddForeignKey
ALTER TABLE "Biyana" ADD CONSTRAINT "Biyana_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
