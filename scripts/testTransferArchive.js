import prisma from '../config/database.js';

async function testTransferArchiveWorkflow() {
  try {
    console.log('🧪 Testing Transfer Archive Workflow\n');
    
    // Step 1: Check current state
    console.log('1️⃣ Current state of A-101:');
    const currentAgreements = await prisma.saleAgreement.findMany({
      where: { plot: { plotNo: 'A-101' } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    currentAgreements.forEach(a => {
      console.log(`  ${a.agreementNumber}: ${a.customer.name} - Archived: ${a.isArchived} - Status: ${a.status}`);
    });
    
    // Step 2: Check the transfer approval logic
    console.log('\n2️⃣ Transfer approval logic check:');
    const transfer = await prisma.transferForm.findFirst({
      where: { plot: { plotNo: 'A-101' } },
      include: { plot: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (transfer) {
      console.log(`  Transfer: ${transfer.transferNumber} - Status: ${transfer.status}`);
      console.log(`  Created: ${transfer.createdAt.toISOString().split('T')[0]}`);
      
      // Step 3: Find the logic that should archive old agreements
      const newAgreement = await prisma.saleAgreement.findFirst({
        where: {
          plotId: transfer.plotId,
          customerId: transfer.toCustomerId,
          status: 'APPROVED'
        }
      });
      
      if (newAgreement) {
        console.log(`  New agreement: ${newAgreement.agreementNumber} - Created: ${newAgreement.createdAt.toISOString().split('T')[0]}`);
        
        // Check if there's a related transfer for this agreement
        const relatedTransfer = await prisma.transferForm.findFirst({
          where: {
            plotId: newAgreement.plotId,
            toCustomerId: newAgreement.customerId,
            status: 'APPROVED'
          }
        });
        
        console.log(`  Related transfer found: ${relatedTransfer ? 'YES' : 'NO'}`);
        
        if (relatedTransfer) {
          // Check if old agreement should be archived
          const oldAgreement = await prisma.saleAgreement.findFirst({
            where: {
              plotId: newAgreement.plotId,
              isLocked: true,
              transferId: relatedTransfer.id
            }
          });
          
          console.log(`  Old locked agreement found: ${oldAgreement ? oldAgreement.agreementNumber : 'NONE'}`);
          
          // The issue might be that the old agreement doesn't have transferId set
          // Let's check all agreements for this plot
          const allPlotAgreements = await prisma.saleAgreement.findMany({
            where: { plotId: newAgreement.plotId },
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
          });
          
          console.log('\n  All agreements for this plot:');
          allPlotAgreements.forEach(a => {
            console.log(`    ${a.agreementNumber}: ${a.customer.name}`);
            console.log(`      isLocked: ${a.isLocked}, isArchived: ${a.isArchived}, transferId: ${a.transferId || 'NULL'}`);
          });
        }
      }
    }
    
    console.log('\n3️⃣ Analysis:');
    console.log('The archiving logic in approvals.js looks for:');
    console.log('- plotId matches');
    console.log('- isLocked: true'); 
    console.log('- transferId matches the transfer');
    console.log('\nIf the old agreement doesn\'t have these fields set during transfer approval,');
    console.log('it won\'t be found and archived when the new sale agreement is approved.');
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testTransferArchiveWorkflow();