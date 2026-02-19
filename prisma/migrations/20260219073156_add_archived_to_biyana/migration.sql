-- AlterTable
ALTER TABLE "Biyana" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Biyana_isArchived_idx" ON "Biyana"("isArchived");
