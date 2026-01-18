import prisma from '../config/database.js';

async function checkA101Agreements() {
  try {
    const agreements = await prisma.saleAgreement.findMany({
      where: { 
        plot: { plotNo: 'A-101' } 
      },
      include: { 
        customer: { select: { name: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('A-101 agreements:');
    agreements.forEach(a => {
      console.log({
        number: a.agreementNumber,
        customer: a.customer.name,
        isArchived: a.isArchived || false,
        isActive: a.isActive !== false,
        isLocked: a.isLocked || false,
        status: a.status,
        date: a.createdAt.toISOString().split('T')[0]
      });
    });
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkA101Agreements();