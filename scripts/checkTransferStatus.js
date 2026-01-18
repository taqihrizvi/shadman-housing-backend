import prisma from '../config/database.js';

async function checkTransferStatus() {
  try {
    const transfer = await prisma.transferForm.findFirst({
      where: { transferNumber: 'TF-2026-0001' }
    });
    
    console.log('TF-2026-0001 Database Status:', transfer.status);
    console.log('Approved At:', transfer.approvedAt);
    console.log('Completed At:', transfer.completedAt);
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransferStatus();