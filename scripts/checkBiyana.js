import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function checkBiyana() {
  try {
    // Test the exact query from the route
    const pendingBiyanas = await prisma.biyana.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
            address: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,
            price: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            email: true,
            signature: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log('✅ Query successful!');
    console.log('Total Pending Biyanas:', pendingBiyanas.length);
    console.log(JSON.stringify(pendingBiyanas, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBiyana();
