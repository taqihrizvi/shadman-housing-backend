import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdmin() {
    try {
        const adminEmail = 'admin@shadman.com';
        const adminPassword = 'AdminPassword123'; // Removed ! to avoid shell issues
        const adminName = 'System Administrator';

        console.log(`Resetting admin user: ${adminEmail}`);

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Upsert admin user
        const user = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
                isActive: true,
                name: adminName
            },
            create: {
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: 'ADMIN',
                isActive: true,
            }
        });

        console.log('✅ Admin user reset successfully!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);

        // Double check with bcrypt.compare right here
        const isMatch = await bcrypt.compare(adminPassword, user.password);
        console.log('Verification check:', isMatch ? 'PASSED' : 'FAILED');

    } catch (error) {
        console.error('❌ Error resetting admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdmin();
