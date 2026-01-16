import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

async function checkAdminPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@shadmanhousing.com' }
    });

    if (!user) {
      console.log('❌ Admin user not found in database');
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Password hash:', user.password);
    
    const matchAdmin123 = await bcrypt.compare('admin123', user.password);
    console.log('\n🔑 Password check:');
    console.log('   "admin123" matches:', matchAdmin123 ? '✅ YES' : '❌ NO');
    
    // Test what password WOULD match
    if (!matchAdmin123) {
      console.log('\n⚠️  Password "admin123" does NOT match the stored hash');
      console.log('   This means either:');
      console.log('   1. The password was changed');
      console.log('   2. The hash is corrupted');
      console.log('   3. You need to recreate the admin user');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPassword();
