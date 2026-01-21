import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPendingTransfers() {
  try {
    console.log('Checking for pending transfers...\n');

    const pendingTransfers = await prisma.transferForm.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        plot: true,
        fromCustomer: true,
        toCustomer: true
      }
    });

    if (pendingTransfers.length === 0) {
      console.log('✅ No pending transfers found');
      return;
    }

    console.log(`Found ${pendingTransfers.length} pending transfer(s):\n`);

    for (const transfer of pendingTransfers) {
      console.log(`Transfer ID: ${transfer.id}`);
      console.log(`Transfer Number: ${transfer.transferNumber}`);
      console.log(`Plot: ${transfer.plot.plotNo} (${transfer.plot.project})`);
      console.log(`From: ${transfer.fromCustomer.name} (${transfer.fromCustomer.cnic})`);
      console.log(`To: ${transfer.toCustomer.name} (${transfer.toCustomer.cnic})`);
      console.log(`Status: ${transfer.status}`);
      console.log(`Created: ${transfer.createdAt}`);
      console.log('---\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingTransfers();
