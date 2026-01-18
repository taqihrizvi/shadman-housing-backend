import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixPlotA101() {
  try {
    console.log('Fixing plot A-101 transfer...\n');
    
    // Get the approved transfer
    const transfer = await prisma.transferForm.findFirst({
      where: {
        transferNumber: 'TF-2026-0001',
        status: 'APPROVED'
      }
    });
    
    if (!transfer) {
      console.log('Transfer not found!');
      return;
    }
    
    console.log('Found transfer:', transfer.id);
    console.log('Updating plot status to TRANSFERRED and setting approvedAt...\n');
    
    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update transfer approvedAt
      await tx.transferForm.update({
        where: { id: transfer.id },
        data: {
          approvedAt: new Date()
        }
      });
      
      // Update plot status to TRANSFERRED
      await tx.inventory.update({
        where: { id: transfer.plotId },
        data: {
          status: 'TRANSFERRED',
          buyerId: transfer.toCustomerId
        }
      });
      
      // Lock the previous sale agreement if exists
      if (transfer.previousSaleAgreementId) {
        await tx.saleAgreement.update({
          where: { id: transfer.previousSaleAgreementId },
          data: {
            isLocked: true,
            isActive: false,
            transferId: transfer.id,
            remarks: `Locked due to plot transfer ${transfer.transferNumber}`
          }
        });
      }
    });
    
    console.log('✓ Plot A-101 status updated to TRANSFERRED');
    console.log('✓ Transfer approvedAt timestamp set');
    console.log('✓ Previous sale agreement locked');
    console.log('\nVerifying changes...\n');
    
    // Verify
    const updatedPlot = await prisma.inventory.findUnique({
      where: { plotNo: 'A-101' },
      select: {
        plotNo: true,
        status: true,
        buyer: { select: { name: true } }
      }
    });
    
    const updatedTransfer = await prisma.transferForm.findUnique({
      where: { id: transfer.id },
      select: {
        transferNumber: true,
        status: true,
        approvedAt: true
      }
    });
    
    console.log('Updated Plot:', updatedPlot);
    console.log('Updated Transfer:', updatedTransfer);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPlotA101();
