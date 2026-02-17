-- AlterEnum
ALTER TYPE "PaymentFormType" ADD VALUE 'TRANSFER_FEE';

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "isCornerPlot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perMarlaPrice" DOUBLE PRECISION;
