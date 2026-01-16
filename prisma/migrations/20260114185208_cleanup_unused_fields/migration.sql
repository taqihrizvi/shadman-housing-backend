/*
  Warnings:

  - The values [GREEN_VALLEY,LAKE_VIEW,PALM_HEIGHTS,SUNSET_GARDENS] on the enum `ProjectName` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `firstInstallmentRemaining` on the `Biyana` table. All the data in the column will be lost.
  - You are about to drop the column `alternatePhone` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `totalInvestment` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `block` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProjectName_new" AS ENUM ('SHADMAN_GREENS');
ALTER TABLE "Inventory" ALTER COLUMN "project" TYPE "ProjectName_new" USING ("project"::text::"ProjectName_new");
ALTER TYPE "ProjectName" RENAME TO "ProjectName_old";
ALTER TYPE "ProjectName_new" RENAME TO "ProjectName";
DROP TYPE "ProjectName_old";
COMMIT;

-- AlterTable
ALTER TABLE "Biyana" DROP COLUMN "firstInstallmentRemaining";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "alternatePhone",
DROP COLUMN "city",
DROP COLUMN "email",
DROP COLUMN "totalInvestment";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "block";
