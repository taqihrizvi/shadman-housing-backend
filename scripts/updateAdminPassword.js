import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

async function updateAdminPassword() {
  try {
    // Generate correct hash for admin123
    const correctHash = await bcrypt.hash('admin123', 12);
    
    console.log('🔄 Updating admin password...');
    console.log('   New hash:', correctHash);
    
    // Update admin user
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@shadmanhousing.com' },
      data: {
        password: correctHash
      }
    });

    console.log('✅ Admin password updated successfully!');
    console.log('   Email: admin@shadmanhousing.com');
    console.log('   Password: admin123');
    console.log('   Name:', updatedUser.name);
    console.log('   Role:', updatedUser.role);
    
    // Verify the update
    const verify = await bcrypt.compare('admin123', updatedUser.password);
    console.log('\n🔐 Verification:');
    console.log('   Password "admin123" matches:', verify ? '✅ YES' : '❌ NO');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();
