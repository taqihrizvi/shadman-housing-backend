import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlotA106() {
  try {
    console.log('🔍 Investigating Plot A-106 Flow\n');
    console.log('='.repeat(80));

    // 1. Get Plot Details
    const plot = await prisma.inventory.findFirst({
      where: { plotNo: 'A-106' },
      include: {
        buyer: true,
        agent: true,
        createdBy: true
      }
    });

    if (!plot) {
      console.log('❌ Plot A-106 not found!');
      return;
    }

    console.log('\n📍 PLOT DETAILS:');
    console.log('  Plot No:', plot.plotNo);
    console.log('  Status:', plot.status);
    console.log('  Price:', plot.price);
    console.log('  Current Buyer:', plot.buyer?.name || 'None');
    console.log('  Buyer ID:', plot.buyerId || 'None');
    console.log('  Sold Date:', plot.soldDate || 'N/A');

    // 2. Get Biyana Forms
    console.log('\n📋 BIYANA FORMS:');
    const biyanaForms = await prisma.biyana.findMany({
      where: { plotId: plot.id },
      include: {
        customer: true,
        approvedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (biyanaForms.length === 0) {
      console.log('  No biyana forms found');
    } else {
      biyanaForms.forEach((b, index) => {
        console.log(`\n  Biyana #${index + 1}:`);
        console.log('    Form Number:', b.formNumber);
        console.log('    Customer:', b.customer.name);
        console.log('    Amount:', b.biyanaAmount);
        console.log('    Status:', b.status);
        console.log('    Date:', b.date);
      });
    }

    // 3. Get Sale Agreements
    console.log('\n📄 SALE AGREEMENTS:');
    const saleAgreements = await prisma.saleAgreement.findMany({
      where: { plotId: plot.id },
      include: {
        customer: true,
        approvedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (saleAgreements.length === 0) {
      console.log('  No sale agreements found');
    } else {
      saleAgreements.forEach((s, index) => {
        console.log(`\n  Agreement #${index + 1}:`);
        console.log('    Agreement Number:', s.agreementNumber);
        console.log('    Customer:', s.customer.name);
        console.log('    Customer ID:', s.customerId);
        console.log('    Total Amount:', s.totalAmount);
        console.log('    Down Payment:', s.downPayment);
        console.log('    Status:', s.status);
        console.log('    Is Locked:', s.isLocked);
        console.log('    Is Active:', s.isActive);
        console.log('    Is Archived:', s.isArchived);
        console.log('    Transfer ID:', s.transferId || 'None');
        console.log('    Created At:', s.createdAt);
        console.log('    Approved At:', s.approvedAt || 'Not approved yet');
      });
    }

    // 4. Get Transfer Forms
    console.log('\n🔄 TRANSFER FORMS:');
    const transfers = await prisma.transferForm.findMany({
      where: { plotId: plot.id },
      include: {
        fromCustomer: true,
        toCustomer: true,
        approvedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (transfers.length === 0) {
      console.log('  No transfer forms found');
    } else {
      transfers.forEach((t, index) => {
        console.log(`\n  Transfer #${index + 1}:`);
        console.log('    Transfer Number:', t.transferNumber);
        console.log('    From Customer:', t.fromCustomer.name, `(ID: ${t.fromCustomerId})`);
        console.log('    To Customer:', t.toCustomer.name, `(ID: ${t.toCustomerId})`);
        console.log('    Status:', t.status);
        console.log('    Previous Sale Agreement ID:', t.previousSaleAgreementId || 'None');
        console.log('    New Sale Agreement ID:', t.newSaleAgreementId || 'None');
        console.log('    Transfer Amount:', t.transferAmount);
        console.log('    Created At:', t.createdAt);
        console.log('    Approved At:', t.approvedAt || 'Not approved yet');
        console.log('    Completed At:', t.completedAt || 'Not completed yet');
      });
    }

    // 5. Get Vouchers/Payments
    console.log('\n💰 VOUCHERS/PAYMENTS:');
    const vouchers = await prisma.voucher.findMany({
      where: { plotId: plot.id },
      include: {
        customer: true
      },
      orderBy: { date: 'desc' }
    });

    if (vouchers.length === 0) {
      console.log('  No vouchers found');
    } else {
      vouchers.forEach((v, index) => {
        console.log(`\n  Voucher #${index + 1}:`);
        console.log('    Voucher No:', v.voucherNo);
        console.log('    Customer:', v.customer?.name || 'N/A');
        console.log('    Amount:', v.amount);
        console.log('    Type:', v.type);
        console.log('    Form Type:', v.formType || 'N/A');
        console.log('    Status:', v.status);
        console.log('    Date:', v.date);
      });
    }

    // 6. Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log('  Plot Status:', plot.status);
    console.log('  Current Buyer:', plot.buyer?.name || 'None');
    console.log('  Total Biyana Forms:', biyanaForms.length);
    console.log('  Total Sale Agreements:', saleAgreements.length);
    console.log('    - Pending:', saleAgreements.filter(s => s.status === 'PENDING').length);
    console.log('    - Approved:', saleAgreements.filter(s => s.status === 'APPROVED').length);
    console.log('    - Rejected:', saleAgreements.filter(s => s.status === 'REJECTED').length);
    console.log('    - Locked:', saleAgreements.filter(s => s.isLocked).length);
    console.log('    - Archived:', saleAgreements.filter(s => s.isArchived).length);
    console.log('  Total Transfers:', transfers.length);
    console.log('    - Pending:', transfers.filter(t => t.status === 'PENDING').length);
    console.log('    - Approved:', transfers.filter(t => t.status === 'APPROVED').length);
    console.log('    - Completed:', transfers.filter(t => t.status === 'COMPLETED').length);
    console.log('  Total Vouchers:', vouchers.length);

    // 7. Flow Analysis
    console.log('\n🔍 FLOW ANALYSIS:');
    if (plot.status === 'TRANSFERRED') {
      const approvedTransfer = transfers.find(t => t.status === 'APPROVED');
      if (approvedTransfer) {
        console.log('  ✅ Plot is TRANSFERRED with an APPROVED transfer');
        console.log('  ✅ Transfer from:', approvedTransfer.fromCustomer.name);
        console.log('  ✅ Transfer to:', approvedTransfer.toCustomer.name);
        console.log('  📌 Current buyer should be:', approvedTransfer.toCustomer.name);
        console.log('  📌 Current buyer in DB is:', plot.buyer?.name || 'None');
        
        if (plot.buyerId !== approvedTransfer.toCustomerId) {
          console.log('  ⚠️  WARNING: Buyer ID mismatch!');
          console.log('      Expected:', approvedTransfer.toCustomerId);
          console.log('      Current:', plot.buyerId);
        }

        // Check for pending sale agreement for new owner
        const pendingAgreementForNewOwner = saleAgreements.find(
          s => s.customerId === approvedTransfer.toCustomerId && s.status === 'PENDING'
        );
        
        if (pendingAgreementForNewOwner) {
          console.log('  ✅ Pending sale agreement exists for new owner');
          console.log('     Agreement Number:', pendingAgreementForNewOwner.agreementNumber);
        } else {
          console.log('  ❌ No pending sale agreement for new owner found');
          console.log('     Action needed: Create sale agreement for', approvedTransfer.toCustomer.name);
        }

        // Check if old agreement is locked
        const oldAgreement = saleAgreements.find(
          s => s.customerId === approvedTransfer.fromCustomerId && s.isLocked
        );
        
        if (oldAgreement) {
          console.log('  ✅ Old sale agreement is locked');
          console.log('     Agreement Number:', oldAgreement.agreementNumber);
          console.log('     Is Archived:', oldAgreement.isArchived);
        } else {
          console.log('  ⚠️  Old sale agreement not found or not locked');
        }
      }
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlotA106();
