-- CreateEnum
CREATE TYPE "InstallmentType" AS ENUM ('MONTHLY_ONLY', 'MONTHLY_QUARTERLY');

-- AlterTable
ALTER TABLE "Biyana" ADD COLUMN     "installmentType" "InstallmentType" DEFAULT 'MONTHLY_ONLY';
