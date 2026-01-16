-- First, update all existing inventory records to SHADMAN_GREENS
-- Note: We need to add SHADMAN_GREENS to the enum first temporarily
ALTER TYPE "ProjectName" ADD VALUE 'SHADMAN_GREENS';

-- Now update all inventory records
UPDATE "Inventory" SET project = 'SHADMAN_GREENS';
