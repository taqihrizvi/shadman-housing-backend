import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function completeTransfer() {
  try {
    const transferId = '93ff0127-5fcc-431e-84bb-3dce1086ed56'; // TRF-000003
    
    console.log('Marking transfer as COMPLETED...\n');

    const transfer = await prisma.transferForm.findUnique({
      where: { id: transferId },
      include: {
        plot: true,
        fromCustomer: true,
        toCustomer: true
      }
    });

    if (!transfer) {
      console.log('❌ Transfer not found');
      return;
    }

    console.log(`Transfer: ${transfer.transferNumber}`);
    console.log(`Plot: ${transfer.plot.plotNo}`);
    console.log(`Current Status: ${transfer.status}`);
    console.log(`Plot Status: ${transfer.plot.status}\n`);

    // Mark transfer as COMPLETED
    const updated = await prisma.transferForm.update({
      where: { id: transferId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    console.log('✅ Transfer marked as COMPLETED');
    console.log(`Completed At: ${updated.completedAt}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeTransfer();
