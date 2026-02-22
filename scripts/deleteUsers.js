import prisma from '../config/database.js';

async function deleteUsers() {
    try {
        const targetEmail = process.argv[2];
        console.log('--- User Deletion Utility ---');

        if (targetEmail) {
            console.log(`Targeting specific user: ${targetEmail}`);
            const user = await prisma.user.findUnique({ where: { email: targetEmail } });
            if (!user) {
                console.log('❌ User not found.');
                return;
            }

            await prisma.user.delete({ where: { id: user.id } });
            console.log(`✅ User ${targetEmail} deleted successfully.`);
        } else {
            console.log('Targeting ALL Manager and Admin accounts...');

            // Count users by role
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
            const managerCount = await prisma.user.count({ where: { role: 'MANAGER' } });
            const totalCount = adminCount + managerCount;

            if (totalCount === 0) {
                console.log('No Admin or Manager accounts found to delete.');
                return;
            }

            console.log(`Found ${adminCount} Admins and ${managerCount} Managers.`);
            console.log('⚠️  WARNING: This will attempt to delete ALL these users.');

            const result = await prisma.user.deleteMany({
                where: {
                    role: { in: ['ADMIN', 'MANAGER'] }
                }
            });

            console.log(`✅ Successfully deleted ${result.count} users.`);
            console.log('\nNOTE: If you deleted yourself, you will need to run the createAdmin script again to log in.');
        }
    } catch (error) {
        if (error.code === 'P2003') {
            console.error('\n❌ ERROR: Cannot delete user(s) because they are linked to existing records (Vouchers, Plots, etc.).');
            console.error('To delete these users, you must first delete or reassign their related records.');
            console.error('Alternative: Use the "isActive: false" update to deactivate them instead of deleting.');
        } else {
            console.error('\n❌ An error occurred:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

deleteUsers();
