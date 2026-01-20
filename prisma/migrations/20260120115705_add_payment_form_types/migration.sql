/*
  Warnings:

  - The `formType` column on the `Voucher` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentFormType" AS ENUM ('INSTALLMENT', 'QUARTERLY', 'BIYANA', 'SALES_AGREEMENT');

-- AlterTable
ALTER TABLE "Voucher" DROP COLUMN "formType",
ADD COLUMN     "formType" "PaymentFormType";
