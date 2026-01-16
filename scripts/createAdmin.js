import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

async function createAdminAccount() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { 
        role: 'ADMIN' 
      }
    });

    if (existingAdmin) {
      console.log('✅ Admin account already exists:');
      console.log('   Email:', existingAdmin.email);
      console.log('   Name:', existingAdmin.name);
      console.log('   Role:', existingAdmin.role);
      return;
    }

    // Create admin account
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@shadmanhousing.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Admin account created successfully!');
    console.log('   Email: admin@shadmanhousing.com');
    console.log('   Password: admin123');
    console.log('   Role: ADMIN');
    console.log('   Name:', admin.name);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminAccount();
