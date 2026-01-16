import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('Starting to clear all data except users...\n');

    // Delete in order of dependencies (child to parent)
    
    console.log('Deleting Witnesses...');
    const witnesses = await prisma.witness.deleteMany({});
    console.log(`✓ Deleted ${witnesses.count} witnesses`);

    console.log('Deleting Notifications...');
    const notifications = await prisma.notification.deleteMany({});
    console.log(`✓ Deleted ${notifications.count} notifications`);

    console.log('Deleting Vouchers...');
    const vouchers = await prisma.voucher.deleteMany({});
    console.log(`✓ Deleted ${vouchers.count} vouchers`);

    console.log('Deleting Transfer Forms...');
    const transfers = await prisma.transferForm.deleteMany({});
    console.log(`✓ Deleted ${transfers.count} transfer forms`);

    console.log('Deleting Sale Agreements...');
    const agreements = await prisma.saleAgreement.deleteMany({});
    console.log(`✓ Deleted ${agreements.count} sale agreements`);

    console.log('Deleting Biyana Forms...');
    const biyanas = await prisma.biyana.deleteMany({});
    console.log(`✓ Deleted ${biyanas.count} biyana forms`);

    console.log('Deleting Inventory...');
    const inventory = await prisma.inventory.deleteMany({});
    console.log(`✓ Deleted ${inventory.count} inventory items`);

    console.log('Deleting Customers...');
    const customers = await prisma.customer.deleteMany({});
    console.log(`✓ Deleted ${customers.count} customers`);

    console.log('\n✅ All data cleared successfully! Users have been preserved.');
    
    // Show remaining user count
    const userCount = await prisma.user.count();
    console.log(`📊 Remaining users: ${userCount}`);

  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData()
  .then(() => {
    console.log('\n✨ Operation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Operation failed:', error);
    process.exit(1);
  });
