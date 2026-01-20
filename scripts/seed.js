import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    // Clear existing data
    await prisma.voucher.deleteMany({});
    await prisma.transferForm.deleteMany({});
    await prisma.witness.deleteMany({});
    await prisma.saleAgreement.deleteMany({});
    await prisma.biyana.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const agentPassword = await bcrypt.hash('agent123', 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@shadmanhousing.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('👤 Admin user created');

    // Create agents
    const ali = await prisma.user.create({
      data: {
        name: 'Ali Hassan',
        email: 'ali@shadmanhousing.com',
        password: agentPassword,
        role: 'AGENT',
      },
    });

    const usman = await prisma.user.create({
      data: {
        name: 'Usman Shah',
        email: 'usman@shadmanhousing.com',
        password: agentPassword,
        role: 'AGENT',
      },
    });

    const kamran = await prisma.user.create({
      data: {
        name: 'Kamran Iqbal',
        email: 'kamran@shadmanhousing.com',
        password: agentPassword,
        role: 'AGENT',
      },
    });

    const agents = [ali, usman, kamran];
    console.log('👥 Agents created');

    // Create customers
    const customer1 = await prisma.customer.create({
      data: {
        name: 'Ahmed Khan',
        fatherName: 'Muhammad Khan',
        cnic: '35201-1234567-1',
        phone: '+92-300-1234567',
        address: '123 Street, DHA Phase 5, Lahore',
        createdById: admin.id,
      },
    });

    const customer2 = await prisma.customer.create({
      data: {
        name: 'Sara Ali',
        fatherName: 'Ali Ahmed',
        cnic: '35201-2345678-2',
        phone: '+92-300-2345678',
        email: 'sara@example.com',
        address: '456 Street, Gulberg III, Lahore',
        createdById: admin.id,
      },
    });

    const customer3 = await prisma.customer.create({
      data: {
        name: 'Usman Malik',
        fatherName: 'Malik Riaz',
        cnic: '35201-3456789-3',
        phone: '+92-300-3456789',
        address: '789 Street, Johar Town, Lahore',
        createdById: admin.id,
      },
    });

    const customers = [customer1, customer2, customer3];
    console.log('👨‍👩‍👧‍👦 Customers created');

    // Create inventory
    const projects = ['GREEN_VALLEY', 'LAKE_VIEW', 'PALM_HEIGHTS', 'SUNSET_GARDENS'];
    const sizes = ['5_MARLA', '7_MARLA', '10_MARLA', '1_KANAL'];
    const basePrices = {
      FIVE_MARLA: 2500000,
      SEVEN_MARLA: 3500000,
      TEN_MARLA: 5000000,
      ONE_KANAL: 8500000,
    };

    for (let i = 0; i < 50; i++) {
      const project = projects[Math.floor(Math.random() * projects.length)];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const plotNumber = `${String(i + 101).padStart(3, '0')}`;
      
      let status = 'AVAILABLE';
      let buyerId = null;
      let soldDate = null;
      let agentId = null;

      // Make 70% of plots sold
      if (Math.random() > 0.3) {
        status = 'SOLD';
        buyerId = customers[Math.floor(Math.random() * customers.length)].id;
        agentId = agents[Math.floor(Math.random() * agents.length)].id;
        soldDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      }

      await prisma.inventory.create({
        data: {
          plotNo: plotNumber,
          project,
          size,
          price: basePrices[size] + Math.floor(Math.random() * 500000),
          status,
          buyerId,
          agentId,
          soldDate,
          description: `Beautiful ${size.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} plot in ${project.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`,
          createdById: admin.id,
        },
      });
    }
    console.log('🏘️  Inventory created (50 plots)');

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('Email: admin@shadmanhousing.com');
    console.log('Password: admin123');
    console.log('\nAgent Credentials:');
    console.log('Email: ali@shadmanhousing.com | Password: agent123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
