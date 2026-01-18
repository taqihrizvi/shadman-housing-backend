import prisma from '../config/database.js';

async function testCompleteWorkflow() {
  try {
    console.log('🔧 Testing Complete Transfer Archive Workflow\n');
    
    // Check the transfer and its previousSaleAgreementId
    const transfer = await prisma.transferForm.findFirst({
      where: { plot: { plotNo: 'A-101' } },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Transfer Details:');
    console.log(`  Number: ${transfer.transferNumber}`);
    console.log(`  Status: ${transfer.status}`);
    console.log(`  Previous Sale Agreement ID: ${transfer.previousSaleAgreementId || 'NOT SET'}`);
    console.log(`  New Sale Agreement ID: ${transfer.newSaleAgreementId || 'NOT SET'}`);
    
    // Check if the old agreement was properly locked during transfer approval
    if (transfer.previousSaleAgreementId) {
      const oldAgreement = await prisma.saleAgreement.findUnique({
        where: { id: transfer.previousSaleAgreementId },
        include: { customer: { select: { name: true } } }
      });
      
      console.log('\nOld Agreement (should be locked):');
      if (oldAgreement) {
        console.log(`  ${oldAgreement.agreementNumber}: ${oldAgreement.customer.name}`);
        console.log(`  isLocked: ${oldAgreement.isLocked}`);
        console.log(`  isArchived: ${oldAgreement.isArchived}`);
        console.log(`  transferId: ${oldAgreement.transferId || 'NOT SET'}`);
      } else {
        console.log('  OLD AGREEMENT NOT FOUND!');
      }
    } else {
      console.log('\n❌ previousSaleAgreementId is not set in transfer!');
      
      // Try to find the old agreement manually
      console.log('\nTrying to find old agreement manually...');
      const allAgreements = await prisma.saleAgreement.findMany({
        where: { plotId: transfer.plotId },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'asc' }
      });
      
      console.log('All agreements for this plot:');
      allAgreements.forEach((a, index) => {
        console.log(`  ${index + 1}. ${a.agreementNumber}: ${a.customer.name} (${a.createdAt.toISOString().split('T')[0]})`);
        console.log(`     isLocked: ${a.isLocked}, isArchived: ${a.isArchived}, transferId: ${a.transferId || 'NONE'}`);
      });
      
      if (allAgreements.length >= 2) {
        const oldestAgreement = allAgreements[0]; // First one should be the old one
        console.log(`\n🔧 The old agreement should be: ${oldestAgreement.agreementNumber}`);
        
        // Update the transfer to set the previousSaleAgreementId
        await prisma.transferForm.update({
          where: { id: transfer.id },
          data: { previousSaleAgreementId: oldestAgreement.id }
        });
        
        // Lock the old agreement if it's not already locked
        if (!oldestAgreement.isLocked) {
          await prisma.saleAgreement.update({
            where: { id: oldestAgreement.id },
            data: {
              isLocked: true,
              transferId: transfer.id,
              remarks: `Locked due to plot transfer ${transfer.transferNumber} (fixed)`
            }
          });
          console.log('✅ Fixed: Locked old agreement and set transferId');
        }
      }
    }
    
    console.log('\n🧪 Now testing the sale agreement approval archiving logic...');
    
    // Test the logic that should archive when new agreement is approved
    const newAgreement = await prisma.saleAgreement.findFirst({
      where: {
        plotId: transfer.plotId,
        customerId: transfer.toCustomerId,
        status: 'APPROVED'
      }
    });
    
    if (newAgreement) {
      // Test the fixed logic
      const relatedTransfer = await prisma.transferForm.findFirst({
        where: {
          plotId: newAgreement.plotId,
          toCustomerId: newAgreement.customerId,
          status: { in: ['APPROVED', 'COMPLETED'] }
        }
      });
      
      console.log(`Related transfer found with new logic: ${relatedTransfer ? 'YES' : 'NO'}`);
      
      if (relatedTransfer) {
        const oldAgreement = await prisma.saleAgreement.findFirst({
          where: {
            plotId: newAgreement.plotId,
            isLocked: true,
            transferId: relatedTransfer.id
          }
        });
        
        console.log(`Old locked agreement found for archiving: ${oldAgreement ? oldAgreement.agreementNumber : 'NO'}`);
        
        if (oldAgreement && !oldAgreement.isArchived) {
          console.log('⚠️  Old agreement found but not archived yet - the workflow should have archived it');
        } else if (oldAgreement && oldAgreement.isArchived) {
          console.log('✅ Old agreement is properly archived');
        }
      }
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteWorkflow();