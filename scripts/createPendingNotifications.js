import prisma from '../config/database.js';
import { createNotification } from '../routes/notifications.js';

async function createNotificationsForPendingApprovals() {
  try {
    console.log('Creating notifications for existing pending approvals...\n');

    // Get all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true },
    });

    console.log(`Found ${admins.length} admin(s)`);

    // Check pending Biyanas
    const pendingBiyanas = await prisma.biyana.findMany({
      where: { status: 'PENDING' },
      select: { id: true, formNumber: true, createdById: true },
    });

    console.log(`Found ${pendingBiyanas.length} pending Biyana form(s)`);

    for (const biyana of pendingBiyanas) {
      for (const admin of admins) {
        await createNotification(
          admin.id,
          'APPROVAL_PENDING',
          'New Biyana Approval',
          `New Biyana form ${biyana.formNumber} submitted for approval`,
          biyana.id,
          'BIYANA'
        );
      }
      console.log(`✓ Created notifications for Biyana ${biyana.formNumber}`);
    }

    // Check pending Sale Agreements
    const pendingSaleAgreements = await prisma.saleAgreement.findMany({
      where: { status: 'PENDING' },
      select: { id: true, agreementNumber: true, createdById: true },
    });

    console.log(`Found ${pendingSaleAgreements.length} pending Sale Agreement(s)`);

    for (const agreement of pendingSaleAgreements) {
      for (const admin of admins) {
        await createNotification(
          admin.id,
          'APPROVAL_PENDING',
          'New Sale Agreement Approval',
          `New Sale Agreement ${agreement.agreementNumber} submitted for approval`,
          agreement.id,
          'SALE_AGREEMENT'
        );
      }
      console.log(`✓ Created notifications for Sale Agreement ${agreement.agreementNumber}`);
    }

    // Check pending Vouchers/Payments
    const pendingVouchers = await prisma.voucher.findMany({
      where: { status: 'PENDING' },
      select: { id: true, voucherNo: true, createdById: true },
    });

    console.log(`Found ${pendingVouchers.length} pending Payment(s)`);

    for (const voucher of pendingVouchers) {
      for (const admin of admins) {
        await createNotification(
          admin.id,
          'APPROVAL_PENDING',
          'New Payment Approval',
          `New payment voucher ${voucher.voucherNo} submitted for approval`,
          voucher.id,
          'PAYMENT'
        );
      }
      console.log(`✓ Created notifications for Payment ${voucher.voucherNo}`);
    }

    console.log('\n✅ All notifications created successfully!');
    
    // Show summary
    const totalNotifications = await prisma.notification.count();
    console.log(`\nTotal notifications in database: ${totalNotifications}`);

  } catch (error) {
    console.error('❌ Error creating notifications:', error);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

createNotificationsForPendingApprovals();
