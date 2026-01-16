import prisma from '../config/database.js';

async function checkBiyana() {
  try {
    const biyanas = await prisma.biyana.findMany({
      take: 5,
    });
    
    console.log('Biyana records:');
    console.log(JSON.stringify(biyanas, null, 2));
    
    if (biyanas.length > 0) {
      console.log('\nFirst record fields:');
      console.log(Object.keys(biyanas[0]));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBiyana();
