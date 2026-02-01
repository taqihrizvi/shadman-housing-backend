-- Add new fields to support form-voucher approval workflow
-- Migration for business-critical approval and payment workflows

-- 1. Update PaymentMethod enum (replace CASH with BANK_DEPOSIT)
ALTER TYPE "PaymentMethod" RENAME VALUE 'CASH' TO 'BANK_DEPOSIT';

-- 2. Add new fields to Biyana table
ALTER TABLE "Biyana" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE "Biyana" ADD COLUMN IF NOT EXISTS "slipNumber" TEXT;

-- 3. Add payment plan fields to SaleAgreement (inherited from Biyana)
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "pricePerMarla" DOUBLE PRECISION;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "totalRemaining" DOUBLE PRECISION;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "lastInstallmentDate" TEXT;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "monthlyInstallments" INTEGER;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "quarterlyInstallments" INTEGER;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "agreementDuration" TEXT;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "monthlyInstallmentAmount" DOUBLE PRECISION;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "quarterlyInstallmentAmount" DOUBLE PRECISION;
ALTER TABLE "SaleAgreement" ADD COLUMN IF NOT EXISTS "installmentType" "InstallmentType";

-- 4. Add form relationship fields to Voucher
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "slipNumber" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "biyanaId" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "saleAgreementId" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "transferId" TEXT;

-- 5. Create foreign key constraints for voucher-form relationships
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_biyanaId_fkey" 
  FOREIGN KEY ("biyanaId") REFERENCES "Biyana"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_saleAgreementId_fkey" 
  FOREIGN KEY ("saleAgreementId") REFERENCES "SaleAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_transferId_fkey" 
  FOREIGN KEY ("transferId") REFERENCES "TransferForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Voucher_biyanaId_idx" ON "Voucher"("biyanaId");
CREATE INDEX IF NOT EXISTS "Voucher_saleAgreementId_idx" ON "Voucher"("saleAgreementId");
CREATE INDEX IF NOT EXISTS "Voucher_transferId_idx" ON "Voucher"("transferId");

-- 7. Add comments for documentation
COMMENT ON COLUMN "Voucher"."biyanaId" IS 'Links voucher to Biyana form for approval workflow';
COMMENT ON COLUMN "Voucher"."saleAgreementId" IS 'Links voucher to Sale Agreement for approval workflow';
COMMENT ON COLUMN "Voucher"."transferId" IS 'Links voucher to Transfer Form for approval workflow';
COMMENT ON COLUMN "Voucher"."slipNumber" IS 'Bank deposit slip number for tracking';
COMMENT ON COLUMN "Voucher"."accountNumber" IS 'Bank account number for deposits';
COMMENT ON COLUMN "Voucher"."rejectionReason" IS 'Reason for voucher rejection (circular loop handling)';
