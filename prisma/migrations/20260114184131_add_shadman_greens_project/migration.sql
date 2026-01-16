-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectName" ADD VALUE 'GREEN_VALLEY';
ALTER TYPE "ProjectName" ADD VALUE 'LAKE_VIEW';
ALTER TYPE "ProjectName" ADD VALUE 'PALM_HEIGHTS';
ALTER TYPE "ProjectName" ADD VALUE 'SUNSET_GARDENS';
