import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPlots() {
    try {
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!admin) {
            console.error('No admin user found. Please create an admin first.');
            process.exit(1);
        }

        const plotsToAdd = [
            // 5 Marla Plots
            { plotNo: 'A-101', project: 'SHADMAN_GREENS', size: 'FIVE_MARLA', price: 2500000 },
            { plotNo: 'A-102', project: 'SHADMAN_GREENS', size: 'FIVE_MARLA', price: 2500000 },
            { plotNo: 'A-103', project: 'SHADMAN_GREENS', size: 'FIVE_MARLA', price: 2550000, isCornerPlot: true },
            { plotNo: 'A-104', project: 'SHADMAN_GREENS', size: 'FIVE_MARLA', price: 2500000 },
            { plotNo: 'A-105', project: 'SHADMAN_GREENS', size: 'FIVE_MARLA', price: 2500000 },

            // 7 Marla Plots
            { plotNo: 'B-201', project: 'SHADMAN_GREENS', size: 'SEVEN_MARLA', price: 3500000 },
            { plotNo: 'B-202', project: 'SHADMAN_GREENS', size: 'SEVEN_MARLA', price: 3500000 },
            { plotNo: 'B-203', project: 'SHADMAN_GREENS', size: 'SEVEN_MARLA', price: 3500000 },
            { plotNo: 'B-204', project: 'SHADMAN_GREENS', size: 'SEVEN_MARLA', price: 3600000, isCornerPlot: true },
            { plotNo: 'B-205', project: 'SHADMAN_GREENS', size: 'SEVEN_MARLA', price: 3500000 },

            // 10 Marla Plots
            { plotNo: 'C-301', project: 'SHADMAN_GREENS', size: 'TEN_MARLA', price: 5000000 },
            { plotNo: 'C-302', project: 'SHADMAN_GREENS', size: 'TEN_MARLA', price: 5000000 },
            { plotNo: 'C-303', project: 'SHADMAN_GREENS', size: 'TEN_MARLA', price: 5100000, isCornerPlot: true },

            // 1 Kanal Plots
            { plotNo: 'D-401', project: 'SHADMAN_GREENS', size: 'ONE_KANAL', price: 9000000 },
            { plotNo: 'D-402', project: 'SHADMAN_GREENS', size: 'ONE_KANAL', price: 9000000 },
        ];

        console.log(`Starting to add ${plotsToAdd.length} plots...`);

        let addedCount = 0;
        let skippedCount = 0;

        for (const plot of plotsToAdd) {
            try {
                const existing = await prisma.inventory.findUnique({
                    where: { plotNo: plot.plotNo }
                });

                if (existing) {
                    console.log(`Skipping ${plot.plotNo} - already exists.`);
                    skippedCount++;
                    continue;
                }

                await prisma.inventory.create({
                    data: {
                        ...plot,
                        status: 'AVAILABLE',
                        createdById: admin.id,
                        description: `A beautiful ${plot.size.replace('_', ' ').toLowerCase()} plot in ${plot.project.replace('_', ' ').toLowerCase()}`
                    }
                });
                console.log(`✓ Added plot ${plot.plotNo}`);
                addedCount++;
            } catch (err) {
                console.error(`Error adding plot ${plot.plotNo}:`, err.message);
            }
        }

        console.log(`\nSummary:`);
        console.log(`Successfully added: ${addedCount}`);
        console.log(`Skipped (duplicates): ${skippedCount}`);

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addPlots();
