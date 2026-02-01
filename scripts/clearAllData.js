import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('🧹 Starting database cleanup (preserving admin user)...\n');

    // Get admin user before clearing
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('⚠️  Warning: No admin user found!');
    } else {
      console.log(`✅ Found admin user: ${adminUser.username} (${adminUser.email})`);
    }

    // Delete in correct order (respecting foreign key constraints)
    console.log('\n📋 Deleting records...\n');

    // 1. Delete notifications
    const notifications = await prisma.notification.deleteMany({});
    console.log(`   Deleted ${notifications.count} notifications`);

    // 2. Delete vouchers (payment/transfer vouchers)
    const vouchers = await prisma.voucher.deleteMany({});
    console.log(`   Deleted ${vouchers.count} vouchers`);

    // 3. Delete sale agreements
    const saleAgreements = await prisma.saleAgreement.deleteMany({});
    console.log(`   Deleted ${saleAgreements.count} sale agreements`);

    // 4. Delete transfer forms
    const transfers = await prisma.transferForm.deleteMany({});
    console.log(`   Deleted ${transfers.count} transfer forms`);

    // 5. Delete biyana forms
    const biyanaForms = await prisma.biyana.deleteMany({});
    console.log(`   Deleted ${biyanaForms.count} biyana forms`);

    // 6. Delete customers (non-admin)
    const customers = await prisma.customer.deleteMany({});
    console.log(`   Deleted ${customers.count} customers`);

    // 7. Reset inventory (plots) - set all back to AVAILABLE and remove buyer references
    const inventory = await prisma.inventory.updateMany({
      data: {
        status: 'AVAILABLE',
        buyerId: null
      }
    });
    console.log(`   Reset ${inventory.count} plots to AVAILABLE`);

    // 8. Delete all users EXCEPT admin
    if (adminUser) {
      const users = await prisma.user.deleteMany({
        where: {
          id: { not: adminUser.id }
        }
      });
      console.log(`   Deleted ${users.count} non-admin users`);
      console.log(`   ✅ Preserved admin user: ${adminUser.username}`);
    }

    console.log('\n✅ Database cleared successfully!');
    console.log('\n📊 Summary:');
    console.log('   - All transactional data cleared');
    console.log('   - All plots reset to AVAILABLE');
    console.log('   - Admin account preserved');
    console.log('   - Ready for fresh data entry');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
