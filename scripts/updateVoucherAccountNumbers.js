import prisma from '../config/database.js';

async function updateVoucherAccountNumbers() {
  try {
    console.log('Starting to update voucher account numbers...');

    // Update Faysal Bank vouchers
    const faysalBankUpdate = await prisma.voucher.updateMany({
      where: {
        bankName: 'FAYSAL_BANK',
        accountNumber: null,
      },
      data: {
        accountNumber: '3163301000004759',
      },
    });

    console.log(`✅ Updated ${faysalBankUpdate.count} Faysal Bank vouchers`);

    // Update Meezan Bank vouchers
    const meezanBankUpdate = await prisma.voucher.updateMany({
      where: {
        bankName: 'MEEZAN_BANK',
        accountNumber: null,
      },
      data: {
        accountNumber: '005920012951826',
      },
    });

    console.log(`✅ Updated ${meezanBankUpdate.count} Meezan Bank vouchers`);

    // Show sample of updated records
    const sampleVouchers = await prisma.voucher.findMany({
      where: {
        OR: [
          { bankName: 'FAYSAL_BANK' },
          { bankName: 'MEEZAN_BANK' },
        ],
      },
      select: {
        voucherNo: true,
        bankName: true,
        accountNumber: true,
        amount: true,
      },
      take: 5,
    });

    console.log('\n📋 Sample updated vouchers:');
    console.table(sampleVouchers);

    console.log('\n✅ Account numbers updated successfully!');
  } catch (error) {
    console.error('❌ Error updating account numbers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateVoucherAccountNumbers();
