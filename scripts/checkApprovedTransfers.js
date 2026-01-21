import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkApprovedTransfers() {
  try {
    console.log('Checking for approved transfers...\n');

    const approvedTransfers = await prisma.transferForm.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        plot: true,
        fromCustomer: true,
        toCustomer: true
      }
    });

    if (approvedTransfers.length === 0) {
      console.log('✅ No approved transfers found');
      return;
    }

    console.log(`Found ${approvedTransfers.length} approved transfer(s):\n`);

    for (const transfer of approvedTransfers) {
      console.log(`Transfer ID: ${transfer.id}`);
      console.log(`Transfer Number: ${transfer.transferNumber}`);
      console.log(`Plot: ${transfer.plot.plotNo} (${transfer.plot.project})`);
      console.log(`Plot Status: ${transfer.plot.status}`);
      console.log(`From: ${transfer.fromCustomer.name} (${transfer.fromCustomer.cnic})`);
      console.log(`To: ${transfer.toCustomer.name} (${transfer.toCustomer.cnic})`);
      console.log(`Status: ${transfer.status}`);
      console.log(`Approved: ${transfer.approvedAt}`);
      console.log('---\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovedTransfers();
