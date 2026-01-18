import prisma from '../config/database.js';

async function archiveOldA101Agreement() {
  try {
    console.log('Finding old agreement to archive...');
    
    // Get the transfer for A-101
    const transfer = await prisma.transferForm.findFirst({
      where: {
        plot: { plotNo: 'A-101' }
      },
      include: {
        plot: { select: { plotNo: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Transfer found:', transfer?.transferNumber);
    
    if (!transfer) {
      console.log('No approved transfer found for A-101');
      return;
    }
    
    // Find the old agreement that should be archived
    const oldAgreement = await prisma.saleAgreement.findFirst({
      where: {
        plotId: transfer.plotId,
        agreementNumber: 'SA-2026-0001', // The old one
        status: 'APPROVED'
      },
      include: {
        customer: { select: { name: true } }
      }
    });
    
    if (oldAgreement) {
      console.log('Found old agreement to archive:', {
        number: oldAgreement.agreementNumber,
        customer: oldAgreement.customer.name,
        isArchived: oldAgreement.isArchived
      });
      
      // Archive it
      const updated = await prisma.saleAgreement.update({
        where: { id: oldAgreement.id },
        data: {
          isArchived: true,
          isActive: false,
          isLocked: true,
          transferId: transfer.id,
          remarks: `Archived due to plot transfer ${transfer.transferNumber}`
        }
      });
      
      console.log('✅ Successfully archived old agreement');
      console.log('Updated fields:', {
        isArchived: updated.isArchived,
        isActive: updated.isActive,
        isLocked: updated.isLocked,
        remarks: updated.remarks
      });
    } else {
      console.log('❌ Old agreement not found');
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

archiveOldA101Agreement();