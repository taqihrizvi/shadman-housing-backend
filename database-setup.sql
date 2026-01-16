-- Shadman Housing Management System - Database Setup Script
-- Clean database creation with only fields used in frontend

-- Drop existing database if exists (WARNING: This will delete all data)
-- Uncomment the next two lines if you want to recreate from scratch
-- DROP DATABASE IF EXISTS shadman_housing;
-- CREATE DATABASE shadman_housing;

-- Connect to the database
-- \c shadman_housing;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== ENUMS ====================

-- User roles
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT', 'MANAGER');

-- Inventory status
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'PENDING', 'RESERVED', 'SOLD');

-- Project names (only Shadman Greens)
CREATE TYPE "ProjectName" AS ENUM ('SHADMAN_GREENS');

-- Plot sizes
CREATE TYPE "PlotSize" AS ENUM ('FIVE_MARLA', 'SEVEN_MARLA', 'TEN_MARLA', 'ONE_KANAL', 'TWO_KANAL');

-- Payment methods
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE');

-- Agreement status
CREATE TYPE "AgreementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- Transfer status
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- Voucher type
CREATE TYPE "VoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

-- Approval status
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Notification type
CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_PENDING', 'APPROVED', 'REJECTED');

-- Related type
CREATE TYPE "NotificationRelatedType" AS ENUM ('BIYANA', 'SALE_AGREEMENT', 'PAYMENT', 'TRANSFER');

-- ==================== TABLES ====================

-- Users table
CREATE TABLE "User" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role "UserRole" DEFAULT 'AGENT',
    "isActive" BOOLEAN DEFAULT TRUE,
    signature TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_email ON "User"(email);

-- Customers table
CREATE TABLE "Customer" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    "fatherName" VARCHAR(255) NOT NULL,
    cnic VARCHAR(15) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "createdById" UUID NOT NULL REFERENCES "User"(id)
);

CREATE INDEX idx_customer_cnic ON "Customer"(cnic);
CREATE INDEX idx_customer_name ON "Customer"(name);

-- Inventory table
CREATE TABLE "Inventory" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "plotNo" VARCHAR(50) UNIQUE NOT NULL,
    project "ProjectName" NOT NULL,
    size "PlotSize" NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    status "InventoryStatus" DEFAULT 'AVAILABLE',
    description TEXT,
    "soldDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "buyerId" UUID REFERENCES "Customer"(id),
    "agentId" UUID REFERENCES "User"(id),
    "createdById" UUID NOT NULL REFERENCES "User"(id)
);

CREATE INDEX idx_inventory_status ON "Inventory"(status);
CREATE INDEX idx_inventory_project ON "Inventory"(project);
CREATE INDEX idx_inventory_plotno ON "Inventory"("plotNo");

-- Biyana forms table
CREATE TABLE "Biyana" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "formNumber" VARCHAR(50) UNIQUE NOT NULL,
    "biyanaAmount" NUMERIC(15, 2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "chequeNumber" VARCHAR(50),
    "bankName" VARCHAR(255),
    "transactionId" VARCHAR(255),
    date TIMESTAMP DEFAULT NOW(),
    remarks TEXT,
    status "ApprovalStatus" DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP,
    "approvedById" UUID REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "customerId" UUID NOT NULL REFERENCES "Customer"(id),
    "plotId" UUID NOT NULL REFERENCES "Inventory"(id),
    "createdById" UUID NOT NULL REFERENCES "User"(id),
    
    -- Installment tracking
    "pricePerMarla" NUMERIC(15, 2),
    "totalAmount" NUMERIC(15, 2),
    "totalRemaining" NUMERIC(15, 2),
    "lastInstallmentDate" VARCHAR(50),
    "monthlyInstallments" INTEGER,
    "quarterlyInstallments" INTEGER,
    "agreementDuration" VARCHAR(50),
    "monthlyInstallmentAmount" NUMERIC(15, 2),
    "quarterlyInstallmentAmount" NUMERIC(15, 2)
);

CREATE INDEX idx_biyana_formnumber ON "Biyana"("formNumber");
CREATE INDEX idx_biyana_date ON "Biyana"(date);
CREATE INDEX idx_biyana_status ON "Biyana"(status);

-- Sale Agreement table
CREATE TABLE "SaleAgreement" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "agreementNumber" VARCHAR(50) UNIQUE NOT NULL,
    "totalAmount" NUMERIC(15, 2) NOT NULL,
    "downPayment" NUMERIC(15, 2) NOT NULL,
    "installmentMonths" INTEGER,
    "monthlyAmount" NUMERIC(15, 2),
    "agreementDate" TIMESTAMP DEFAULT NOW(),
    "possessionDate" TIMESTAMP,
    terms TEXT,
    status "ApprovalStatus" DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP,
    "approvedById" UUID REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "customerId" UUID NOT NULL REFERENCES "Customer"(id),
    "plotId" UUID NOT NULL REFERENCES "Inventory"(id),
    "createdById" UUID NOT NULL REFERENCES "User"(id)
);

CREATE INDEX idx_saleagreement_number ON "SaleAgreement"("agreementNumber");
CREATE INDEX idx_saleagreement_status ON "SaleAgreement"(status);

-- Witnesses table
CREATE TABLE "Witness" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnic VARCHAR(15) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "agreementId" UUID NOT NULL REFERENCES "SaleAgreement"(id) ON DELETE CASCADE
);

-- Transfer Form table
CREATE TABLE "TransferForm" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "transferNumber" VARCHAR(50) UNIQUE NOT NULL,
    "transferAmount" NUMERIC(15, 2) NOT NULL,
    "transferDate" TIMESTAMP DEFAULT NOW(),
    "transferFee" NUMERIC(15, 2) DEFAULT 0,
    reason TEXT,
    status "TransferStatus" DEFAULT 'PENDING',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "plotId" UUID NOT NULL REFERENCES "Inventory"(id),
    "fromCustomerId" UUID NOT NULL REFERENCES "Customer"(id),
    "toCustomerId" UUID NOT NULL REFERENCES "Customer"(id),
    "createdById" UUID NOT NULL REFERENCES "User"(id),
    "approvedById" UUID REFERENCES "User"(id)
);

CREATE INDEX idx_transfer_number ON "TransferForm"("transferNumber");
CREATE INDEX idx_transfer_status ON "TransferForm"(status);

-- Voucher table
CREATE TABLE "Voucher" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "voucherNo" VARCHAR(50) UNIQUE NOT NULL,
    type "VoucherType" DEFAULT 'RECEIPT',
    amount NUMERIC(15, 2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "chequeNumber" VARCHAR(50),
    "bankName" VARCHAR(255),
    "transactionId" VARCHAR(255),
    description TEXT,
    date TIMESTAMP DEFAULT NOW(),
    "formType" VARCHAR(50),
    "formId" VARCHAR(255),
    status "ApprovalStatus" DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP,
    "approvedById" UUID REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "customerId" UUID NOT NULL REFERENCES "Customer"(id),
    "plotId" UUID REFERENCES "Inventory"(id),
    "createdById" UUID NOT NULL REFERENCES "User"(id)
);

CREATE INDEX idx_voucher_number ON "Voucher"("voucherNo");
CREATE INDEX idx_voucher_date ON "Voucher"(date);
CREATE INDEX idx_voucher_customer ON "Voucher"("customerId");
CREATE INDEX idx_voucher_status ON "Voucher"(status);

-- Notifications table
CREATE TABLE "Notification" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type "NotificationType" NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    "relatedId" VARCHAR(255),
    "relatedType" "NotificationRelatedType",
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_user ON "Notification"("userId");
CREATE INDEX idx_notification_read ON "Notification"(read);
CREATE INDEX idx_notification_created ON "Notification"("createdAt");

-- ==================== DEFAULT DATA ====================

-- Create default admin user
-- Password: admin123 (hashed with bcryptjs, 12 rounds)
-- Note: This hash is generated using bcrypt.hash('admin123', 12)
-- You can also use backend/scripts/createAdmin.js to create admin user via Prisma
INSERT INTO "User" (id, name, email, password, role, "isActive")
VALUES (
    uuid_generate_v4(),
    'Admin User',
    'admin@shadmanhousing.com',
    '$2a$12$ib4HZreaxl/OnDonrnuyP.JDlWkOxXWC5qKPyaP/f1mooL5iNR0VG',
    'ADMIN',
    TRUE
);

-- ==================== NOTES ====================

-- To use this script:
-- 1. Make sure PostgreSQL is running
-- 2. Create the database: createdb shadman_housing
-- 3. Run this script: psql -d shadman_housing -f setup.sql
-- 4. Update your .env file with: DATABASE_URL="postgresql://username:password@localhost:5432/shadman_housing"

-- Default admin credentials:
-- Email: admin@shadmanhousing.com
-- Password: admin123

-- Fields removed based on frontend audit:
-- - Inventory.block (not used in frontend)
-- - Customer.alternatePhone, email, city, totalInvestment (not used in forms)
-- - Biyana.firstInstallmentRemaining (removed from frontend)
-- - Old project names (only SHADMAN_GREENS is used)
