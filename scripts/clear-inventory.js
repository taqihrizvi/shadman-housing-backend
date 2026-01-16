import dotenv from 'dotenv';
import prisma from '../config/database.js';

dotenv.config();

const clearInventory = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    // Delete all related records first (due to foreign key constraints)
    await prisma.voucher.deleteMany({});
    console.log('🗑️  Deleted all vouchers');

    await prisma.transferForm.deleteMany({});
    console.log('🗑️  Deleted all transfer forms');

    await prisma.witness.deleteMany({});
    console.log('🗑️  Deleted all witnesses');

    await prisma.saleAgreement.deleteMany({});
    console.log('🗑️  Deleted all sale agreements');

    await prisma.biyana.deleteMany({});
    console.log('🗑️  Deleted all biyana forms');

    // Finally delete inventory
    const result = await prisma.inventory.deleteMany({});
    console.log(`🗑️  Deleted ${result.count} inventory items`);

    console.log('\n✅ Inventory data cleared successfully!');
    console.log('Users and customers are preserved.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing inventory:', error);
    process.exit(1);
  }
};

clearInventory();
