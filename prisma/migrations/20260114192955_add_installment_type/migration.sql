/*
  Warnings:

  - The values [MONTHLY_QUARTERLY] on the enum `InstallmentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InstallmentType_new" AS ENUM ('MONTHLY_ONLY', 'MONTHLY_AND_QUARTERLY');
ALTER TABLE "Biyana" ALTER COLUMN "installmentType" DROP DEFAULT;
ALTER TABLE "Biyana" ALTER COLUMN "installmentType" TYPE "InstallmentType_new" USING ("installmentType"::text::"InstallmentType_new");
ALTER TYPE "InstallmentType" RENAME TO "InstallmentType_old";
ALTER TYPE "InstallmentType_new" RENAME TO "InstallmentType";
DROP TYPE "InstallmentType_old";
ALTER TABLE "Biyana" ALTER COLUMN "installmentType" SET DEFAULT 'MONTHLY_ONLY';
COMMIT;
