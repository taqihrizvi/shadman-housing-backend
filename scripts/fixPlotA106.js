import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPlotA106Transfer() {
  try {
    console.log('🔧 Fixing Plot A-106 Transfer Flow\n');

    const transfer = await prisma.transferForm.findFirst({
      where: { transferNumber: 'TRF-000002' }
    });

    const newAgreement = await prisma.saleAgreement.findUnique({
      where: { id: 'dbda26e5-ab70-457b-9f0e-ef7b5e535a8f' }
    });

    console.log('Current State:');
    console.log('  Transfer Status:', transfer.status);
    console.log('  Transfer previousSaleAgreementId:', transfer.previousSaleAgreementId);
    console.log('  Transfer newSaleAgreementId:', transfer.newSaleAgreementId);
    console.log('  New Agreement Status:', newAgreement.status);
    console.log('  New Agreement isArchived:', newAgreement.isArchived);

    console.log('\n📝 Applying Fix...\n');

    // Update the transfer to mark it as completed and link to the new agreement
    await prisma.transferForm.update({
      where: { id: transfer.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        newSaleAgreementId: newAgreement.id,
        approvedAt: transfer.approvedAt || new Date() // Set approved date if not set
      }
    });

    console.log('✅ Transfer updated to COMPLETED');
    console.log('✅ New sale agreement linked to transfer');

    console.log('\n🎉 Fix completed successfully!');
    console.log('\nNote: The old owner (Syed Waqar Hassan Naqvi) never had a sale agreement.');
    console.log('This is acceptable because the plot was only at Biyana stage before transfer.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPlotA106Transfer();
