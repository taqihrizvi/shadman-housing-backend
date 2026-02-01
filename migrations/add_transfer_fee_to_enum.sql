-- Add TRANSFER_FEE to PaymentFormType enum
-- Run this manually if automatic migration fails

ALTER TYPE "PaymentFormType" ADD VALUE IF NOT EXISTS 'TRANSFER_FEE';

-- Note: This migration adds a new payment form type for transfer fees
-- This allows recording transfer fee payments for plots with pending transfer forms
