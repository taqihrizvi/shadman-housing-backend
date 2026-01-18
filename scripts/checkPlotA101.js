import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPlot() {
  try {
    const plots = await prisma.inventory.findMany({
      where: { plotNo: 'A-101' },
      select: {
        id: true,
        plotNo: true,
        status: true,
        buyerId: true,
        buyer: {
          select: { name: true }
        }
      }
    });
    
    console.log('Plot A-101 status:');
    console.log(JSON.stringify(plots, null, 2));
    
    // Also check transfers
    const transfers = await prisma.transferForm.findMany({
      where: {
        plot: { plotNo: 'A-101' }
      },
      select: {
        id: true,
        transferNumber: true,
        status: true,
        fromCustomer: { select: { name: true } },
        toCustomer: { select: { name: true } },
        createdAt: true,
        approvedAt: true,
        completedAt: true
      }
    });
    
    console.log('\nTransfers for A-101:');
    console.log(JSON.stringify(transfers, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlot();
