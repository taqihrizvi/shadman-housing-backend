import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAllAdmins() {
    try {
        const password = 'AdminPassword123';
        const hashedPassword = await bcrypt.hash(password, 12);

        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' }
        });

        console.log(`Found ${admins.length} admin accounts.`);

        for (const admin of admins) {
            await prisma.user.update({
                where: { id: admin.id },
                data: {
                    password: hashedPassword,
                    isActive: true
                }
            });
            console.log(`Updated password for: ${admin.email}`);
        }

        console.log('\n✅ All admin accounts have been reset.');
        console.log('New Password for all:', password);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAllAdmins();
