-- AlterTable
ALTER TABLE "Biyana" ADD COLUMN     "agreementDuration" TEXT,
ADD COLUMN     "firstInstallmentRemaining" DOUBLE PRECISION,
ADD COLUMN     "lastInstallmentDate" TEXT,
ADD COLUMN     "monthlyInstallmentAmount" DOUBLE PRECISION,
ADD COLUMN     "monthlyInstallments" INTEGER,
ADD COLUMN     "pricePerMarla" DOUBLE PRECISION,
ADD COLUMN     "quarterlyInstallmentAmount" DOUBLE PRECISION,
ADD COLUMN     "quarterlyInstallments" INTEGER,
ADD COLUMN     "totalAmount" DOUBLE PRECISION,
ADD COLUMN     "totalRemaining" DOUBLE PRECISION;
