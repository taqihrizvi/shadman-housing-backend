/*
  Warnings:

  - The values [GREEN_VALLEY,LAKE_VIEW,PALM_HEIGHTS,SUNSET_GARDENS] on the enum `ProjectName` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProjectName_new" AS ENUM ('SHADMAN_GREENS');
ALTER TABLE "Inventory" ALTER COLUMN "project" TYPE "ProjectName_new" USING ("project"::text::"ProjectName_new");
ALTER TYPE "ProjectName" RENAME TO "ProjectName_old";
ALTER TYPE "ProjectName_new" RENAME TO "ProjectName";
DROP TYPE "ProjectName_old";
COMMIT;
