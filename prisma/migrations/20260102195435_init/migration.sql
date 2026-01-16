-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT', 'MANAGER');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "ProjectName" AS ENUM ('GREEN_VALLEY', 'LAKE_VIEW', 'PALM_HEIGHTS', 'SUNSET_GARDENS');

-- CreateEnum
CREATE TYPE "PlotSize" AS ENUM ('5_MARLA', '7_MARLA', '10_MARLA', '1_KANAL', '2_KANAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "cnic" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Lahore',
    "totalInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "plotNo" TEXT NOT NULL,
    "project" "ProjectName" NOT NULL,
    "block" TEXT NOT NULL,
    "size" "PlotSize" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "soldDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buyerId" TEXT,
    "agentId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Biyana" (
    "id" TEXT NOT NULL,
    "formNumber" TEXT NOT NULL,
    "biyanaAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "chequeNumber" TEXT,
    "bankName" TEXT,
    "transactionId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Biyana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleAgreement" (
    "id" TEXT NOT NULL,
    "agreementNumber" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL,
    "installmentMonths" INTEGER,
    "monthlyAmount" DOUBLE PRECISION,
    "agreementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "possessionDate" TIMESTAMP(3),
    "terms" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SaleAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Witness" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreementId" TEXT NOT NULL,

    CONSTRAINT "Witness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferForm" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "transferAmount" DOUBLE PRECISION NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plotId" TEXT NOT NULL,
    "fromCustomerId" TEXT NOT NULL,
    "toCustomerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "TransferForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL DEFAULT 'RECEIPT',
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "chequeNumber" TEXT,
    "bankName" TEXT,
    "transactionId" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formType" TEXT,
    "formId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "plotId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cnic_key" ON "Customer"("cnic");

-- CreateIndex
CREATE INDEX "Customer_cnic_idx" ON "Customer"("cnic");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_plotNo_key" ON "Inventory"("plotNo");

-- CreateIndex
CREATE INDEX "Inventory_status_idx" ON "Inventory"("status");

-- CreateIndex
CREATE INDEX "Inventory_project_idx" ON "Inventory"("project");

-- CreateIndex
CREATE INDEX "Inventory_plotNo_idx" ON "Inventory"("plotNo");

-- CreateIndex
CREATE UNIQUE INDEX "Biyana_formNumber_key" ON "Biyana"("formNumber");

-- CreateIndex
CREATE INDEX "Biyana_formNumber_idx" ON "Biyana"("formNumber");

-- CreateIndex
CREATE INDEX "Biyana_date_idx" ON "Biyana"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SaleAgreement_agreementNumber_key" ON "SaleAgreement"("agreementNumber");

-- CreateIndex
CREATE INDEX "SaleAgreement_agreementNumber_idx" ON "SaleAgreement"("agreementNumber");

-- CreateIndex
CREATE INDEX "SaleAgreement_status_idx" ON "SaleAgreement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransferForm_transferNumber_key" ON "TransferForm"("transferNumber");

-- CreateIndex
CREATE INDEX "TransferForm_transferNumber_idx" ON "TransferForm"("transferNumber");

-- CreateIndex
CREATE INDEX "TransferForm_status_idx" ON "TransferForm"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNo_key" ON "Voucher"("voucherNo");

-- CreateIndex
CREATE INDEX "Voucher_voucherNo_idx" ON "Voucher"("voucherNo");

-- CreateIndex
CREATE INDEX "Voucher_date_idx" ON "Voucher"("date");

-- CreateIndex
CREATE INDEX "Voucher_customerId_idx" ON "Voucher"("customerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Biyana" ADD CONSTRAINT "Biyana_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Biyana" ADD CONSTRAINT "Biyana_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Biyana" ADD CONSTRAINT "Biyana_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAgreement" ADD CONSTRAINT "SaleAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAgreement" ADD CONSTRAINT "SaleAgreement_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAgreement" ADD CONSTRAINT "SaleAgreement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "SaleAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferForm" ADD CONSTRAINT "TransferForm_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferForm" ADD CONSTRAINT "TransferForm_fromCustomerId_fkey" FOREIGN KEY ("fromCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferForm" ADD CONSTRAINT "TransferForm_toCustomerId_fkey" FOREIGN KEY ("toCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferForm" ADD CONSTRAINT "TransferForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferForm" ADD CONSTRAINT "TransferForm_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
