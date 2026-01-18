import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateTransferAmount() {
  try {
    // Find plot A-101
    const plot = await prisma.inventory.findFirst({
      where: { plotNo: 'A-101' },
      select: { id: true, plotNo: true, price: true, status: true }
    });

    console.log('Plot A-101:', JSON.stringify(plot, null, 2));

    if (!plot) {
      console.log('Plot A-101 not found');
      return;
    }

    // Find all transfers for this plot
    const transfers = await prisma.transferForm.findMany({
      where: { plotId: plot.id },
      select: { id: true, transferNumber: true, transferAmount: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\nTransfers for A-101:', JSON.stringify(transfers, null, 2));

    if (transfers.length === 0) {
      console.log('\nNo transfers found for plot A-101');
      return;
    }

    // Update the most recent transfer amount to Rs 1,150,000
    const latestTransfer = transfers[0];
    console.log('\nUpdating transfer:', latestTransfer.transferNumber);
    
    const updated = await prisma.transferForm.update({
      where: { id: latestTransfer.id },
      data: { transferAmount: 1150000 }
    });

    console.log('\nUpdated transfer:');
    console.log('Transfer Number:', updated.transferNumber);
    console.log('Old Amount: Rs', latestTransfer.transferAmount.toLocaleString());
    console.log('New Amount: Rs', updated.transferAmount.toLocaleString());
    console.log('\n✅ Transfer amount updated successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTransferAmount();
