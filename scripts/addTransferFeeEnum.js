import dotenv from 'dotenv';
import prisma from '../config/database.js';

dotenv.config();

async function addTransferFeeEnum() {
  try {
    console.log('Adding TRANSFER_FEE to PaymentFormType enum...');
    
    await prisma.$executeRawUnsafe(`ALTER TYPE "PaymentFormType" ADD VALUE IF NOT EXISTS 'TRANSFER_FEE';`);
    
    console.log('✅ Migration successful! TRANSFER_FEE added to PaymentFormType enum.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addTransferFeeEnum();
