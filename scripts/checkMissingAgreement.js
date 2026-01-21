import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMissingAgreement() {
  try {
    console.log('🔍 Checking for missing old sale agreement\n');

    // Get the transfer with previousSaleAgreementId
    const transfer = await prisma.transferForm.findFirst({
      where: { transferNumber: 'TRF-000002' }
    });

    console.log('Transfer previousSaleAgreementId:', transfer.previousSaleAgreementId);

    // Try to find this agreement
    if (transfer.previousSaleAgreementId) {
      const oldAgreement = await prisma.saleAgreement.findUnique({
        where: { id: transfer.previousSaleAgreementId },
        include: {
          customer: true
        }
      });

      if (oldAgreement) {
        console.log('\n✅ OLD SALE AGREEMENT FOUND:');
        console.log('  Agreement Number:', oldAgreement.agreementNumber);
        console.log('  Customer:', oldAgreement.customer.name);
        console.log('  Customer ID:', oldAgreement.customerId);
        console.log('  Status:', oldAgreement.status);
        console.log('  Is Locked:', oldAgreement.isLocked);
        console.log('  Is Active:', oldAgreement.isActive);
        console.log('  Is Archived:', oldAgreement.isArchived);
        console.log('  Transfer ID:', oldAgreement.transferId || 'None');
      } else {
        console.log('\n❌ OLD SALE AGREEMENT NOT FOUND with ID:', transfer.previousSaleAgreementId);
      }
    }

    // Check all agreements for plot A-106
    const plot = await prisma.inventory.findFirst({
      where: { plotNo: 'A-106' }
    });

    console.log('\n📄 ALL SALE AGREEMENTS FOR PLOT A-106:');
    const allAgreements = await prisma.saleAgreement.findMany({
      where: { plotId: plot.id },
      include: {
        customer: true
      },
      orderBy: { createdAt: 'asc' }
    });

    allAgreements.forEach((a, index) => {
      console.log(`\n  Agreement #${index + 1}:`);
      console.log('    ID:', a.id);
      console.log('    Agreement Number:', a.agreementNumber);
      console.log('    Customer:', a.customer.name);
      console.log('    Customer ID:', a.customerId);
      console.log('    Status:', a.status);
      console.log('    Is Locked:', a.isLocked);
      console.log('    Is Active:', a.isActive);
      console.log('    Is Archived:', a.isArchived);
      console.log('    Transfer ID:', a.transferId || 'None');
      console.log('    Created At:', a.createdAt);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingAgreement();
