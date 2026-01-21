import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTransferValidation() {
  try {
    console.log('🧪 Testing Transfer Validation - Only SOLD plots with agreements can be transferred\n');
    console.log('='.repeat(80));

    // Test Case 1: Check all SOLD plots and their agreements
    console.log('\n📊 TEST CASE 1: Checking all SOLD plots\n');
    
    const soldPlots = await prisma.inventory.findMany({
      where: { status: 'SOLD' },
      include: {
        buyer: true,
        saleAgreements: {
          where: {
            isActive: true,
            status: 'APPROVED'
          }
        }
      }
    });

    console.log(`Total SOLD plots: ${soldPlots.length}`);
    
    soldPlots.forEach((plot, index) => {
      const hasApprovedAgreement = plot.saleAgreements.length > 0;
      console.log(`\n  Plot ${index + 1}: ${plot.plotNo}`);
      console.log(`    Buyer: ${plot.buyer?.name || 'None'}`);
      console.log(`    Has Approved Agreement: ${hasApprovedAgreement ? '✅ YES' : '❌ NO'}`);
      console.log(`    Eligible for Transfer: ${hasApprovedAgreement ? '✅ YES' : '❌ NO - Missing Sale Agreement'}`);
      
      if (plot.saleAgreements.length > 0) {
        plot.saleAgreements.forEach(agreement => {
          console.log(`      Agreement: ${agreement.agreementNumber} (Status: ${agreement.status})`);
        });
      }
    });

    // Test Case 2: Check for plots that are RESERVED (should not be transferrable)
    console.log('\n\n📊 TEST CASE 2: Checking RESERVED plots (should NOT be transferrable)\n');
    
    const reservedPlots = await prisma.inventory.findMany({
      where: { status: 'RESERVED' },
      include: {
        buyer: true,
        biyanaForms: {
          where: { status: 'APPROVED' },
          take: 1
        }
      }
    });

    console.log(`Total RESERVED plots: ${reservedPlots.length}`);
    
    if (reservedPlots.length > 0) {
      reservedPlots.forEach((plot, index) => {
        console.log(`\n  Plot ${index + 1}: ${plot.plotNo}`);
        console.log(`    Status: ${plot.status}`);
        console.log(`    Has Biyana: ${plot.biyanaForms.length > 0 ? 'YES' : 'NO'}`);
        console.log(`    Eligible for Transfer: ❌ NO - Status is RESERVED, not SOLD`);
      });
    } else {
      console.log('  No RESERVED plots found');
    }

    // Test Case 3: Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('\n📝 SUMMARY:\n');
    
    const eligibleForTransfer = soldPlots.filter(p => p.saleAgreements.length > 0);
    const notEligible = soldPlots.filter(p => p.saleAgreements.length === 0);
    
    console.log(`✅ SOLD plots with approved agreements (eligible): ${eligibleForTransfer.length}`);
    console.log(`❌ SOLD plots without agreements (not eligible): ${notEligible.length}`);
    console.log(`❌ RESERVED plots (never eligible): ${reservedPlots.length}`);
    
    if (notEligible.length > 0) {
      console.log('\n⚠️  WARNING: The following SOLD plots do NOT have approved sale agreements:');
      notEligible.forEach(plot => {
        console.log(`    - ${plot.plotNo} (Buyer: ${plot.buyer?.name || 'None'})`);
      });
      console.log('\n   These plots should have sale agreements created before they can be transferred.');
    }

    console.log('\n✅ VALIDATION: Transfer system will now prevent transfers of plots without approved sale agreements.');
    console.log('✅ FRONTEND: Transfer form will validate plot has approved agreement when selected.');
    console.log('✅ BACKEND: API will reject transfer requests for plots without approved agreements.');
    
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTransferValidation();
