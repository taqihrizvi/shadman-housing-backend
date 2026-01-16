import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProjectNames() {
  try {
    console.log('Updating all inventory projects to SHADMAN_GREENS...\n');

    // First, let's check current projects
    const currentProjects = await prisma.inventory.groupBy({
      by: ['project'],
      _count: true,
    });

    console.log('Current project distribution:');
    currentProjects.forEach(p => {
      console.log(`  ${p.project}: ${p._count} plots`);
    });

    // Update all inventory to SHADMAN_GREENS
    const result = await prisma.inventory.updateMany({
      data: {
        project: 'SHADMAN_GREENS',
      },
    });

    console.log(`\n✅ Updated ${result.count} inventory records to SHADMAN_GREENS`);

  } catch (error) {
    console.error('❌ Error updating project names:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateProjectNames()
  .then(() => {
    console.log('\n✨ Project update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Project update failed:', error);
    process.exit(1);
  });
