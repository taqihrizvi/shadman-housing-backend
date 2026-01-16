import prisma from '../config/database.js';

async function updateAdminSignature() {
  try {
    // Update admin signature path
    const admin = await prisma.user.update({
      where: {
        email: 'admin@shadmanhousing.com',
      },
      data: {
        signature: '/signatures/admin-signature.png', // Update this path if your file has a different name
      },
    });

    console.log('✅ Admin signature updated successfully!');
    console.log('Admin:', admin.name);
    console.log('Signature path:', admin.signature);
    console.log('\n📝 Make sure you have placed your signature image at:');
    console.log('   backend/public/signatures/admin-signature.png');
    console.log('\n🌐 The signature will be accessible at:');
    console.log('   http://localhost:5000/signatures/admin-signature.png');

  } catch (error) {
    console.error('❌ Error updating admin signature:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminSignature();
