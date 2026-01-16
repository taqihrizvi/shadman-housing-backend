import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

async function createManagerAccount() {
  try {
    // Check if manager already exists
    const existingManager = await prisma.user.findFirst({
      where: { 
        role: 'MANAGER' 
      }
    });

    if (existingManager) {
      console.log('✅ Manager account already exists:');
      console.log('   Email:', existingManager.email);
      console.log('   Name:', existingManager.name);
      console.log('   Role:', existingManager.role);
      return;
    }

    // Create manager account
    const hashedPassword = await bcrypt.hash('manager123', 12);
    
    const manager = await prisma.user.create({
      data: {
        name: 'Manager User',
        email: 'manager@shadmanhousing.com',
        password: hashedPassword,
        role: 'MANAGER',
        isActive: true,
      },
    });

    console.log('✅ Manager account created successfully!');
    console.log('   Email: manager@shadmanhousing.com');
    console.log('   Password: manager123');
    console.log('   Role: MANAGER');
    console.log('   Name:', manager.name);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createManagerAccount();
