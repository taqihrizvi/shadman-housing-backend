import express from 'express';
import prisma from '../config/database.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Inventory stats
    const totalInventory = await prisma.inventory.count();
    const availableCount = await prisma.inventory.count({ where: { status: 'AVAILABLE' } });
    const reservedCount = await prisma.inventory.count({ where: { status: 'RESERVED' } });
    const soldCount = await prisma.inventory.count({ where: { status: 'SOLD' } });
    const unsoldCount = await prisma.inventory.count({ where: { status: 'AVAILABLE' } });

    // Sales stats
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const monthlySales = await prisma.inventory.count({
      where: {
        status: 'SOLD',
        soldDate: { gte: currentMonth },
      },
    });

    const lastMonthSales = await prisma.inventory.count({
      where: {
        status: 'SOLD',
        soldDate: { gte: lastMonth, lt: currentMonth },
      },
    });

    const salesGrowth = lastMonthSales > 0 
      ? ((monthlySales - lastMonthSales) / lastMonthSales * 100).toFixed(1)
      : 0;

    // Revenue stats
    const monthlyRevenue = await prisma.inventory.aggregate({
      where: {
        status: 'SOLD',
        soldDate: { gte: currentMonth },
      },
      _sum: {
        price: true,
      },
    });

    const lastMonthRevenue = await prisma.inventory.aggregate({
      where: {
        status: 'SOLD',
        soldDate: { gte: lastMonth, lt: currentMonth },
      },
      _sum: {
        price: true,
      },
    });

    const currentRevenue = monthlyRevenue._sum.price || 0;
    const previousRevenue = lastMonthRevenue._sum.price || 0;
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : 0;

    // Pending payments (from sale agreements - calculate actual pending amount)
    // Get active agreements with current plot owners
    const activeAgreements = await prisma.saleAgreement.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        plotId: true,
        totalAmount: true,
        downPayment: true,
        plot: {
          select: {
            buyerId: true,
          },
        },
      },
    });

    // Calculate total pending by subtracting all payments made for each plot
    let pendingPaymentsTotal = 0;
    let pendingCustomersCount = 0;
    const processedCustomers = new Set();

    for (const agreement of activeAgreements) {
      // Get APPROVED vouchers only for this plot
      const vouchers = await prisma.voucher.findMany({
        where: {
          plotId: agreement.plotId,
          type: 'RECEIPT',
          status: 'APPROVED',
        },
        select: {
          amount: true,
        },
      });

      // Get APPROVED biyana payment for this plot
      const biyana = await prisma.biyana.findFirst({
        where: {
          plotId: agreement.plotId,
          status: 'APPROVED',
        },
        select: {
          tokenAmount: true,
        },
      });

      // Calculate total paid: Down Payment + Approved Biyana + Approved Vouchers
      const totalVoucherAmount = vouchers.reduce((sum, payment) => sum + payment.amount, 0);
      const biyanaAmount = biyana?.tokenAmount || 0;
      const downPayment = agreement.downPayment || 0;
      const totalPaid = downPayment + biyanaAmount + totalVoucherAmount;
      
      // Calculate pending amount = Total Amount - Total Paid (Approved Only)
      const pendingAmount = agreement.totalAmount - totalPaid;
      
      // Only count if there's still a pending amount
      if (pendingAmount > 0) {
        pendingPaymentsTotal += pendingAmount;
        // Count unique customers based on current plot owner
        const currentOwnerId = agreement.plot?.buyerId;
        if (currentOwnerId && !processedCustomers.has(currentOwnerId)) {
          processedCustomers.add(currentOwnerId);
          pendingCustomersCount += 1;
        }
      }
    }

    res.json({
      success: true,
      data: {
        inventory: {
          total: totalInventory,
          available: availableCount,
          reserved: reservedCount,
          sold: soldCount,
          unsold: unsoldCount,
        },
        sales: {
          monthly: monthlySales,
          growth: parseFloat(salesGrowth),
        },
        revenue: {
          monthly: currentRevenue,
          growth: parseFloat(revenueGrowth),
        },
        pendingPayments: {
          amount: pendingPaymentsTotal,
          customers: pendingCustomersCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/reports/sales
// @desc    Get sales report
// @access  Private
router.get('/sales', protect, async (req, res) => {
  try {
    const { startDate, endDate, project } = req.query;

    const where = { status: 'SOLD' };
    
    if (startDate && endDate) {
      where.soldDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (project && project !== 'All Projects') {
      where.project = project;
    }

    // Get sold inventory with soldDate for grouping
    const soldInventory = await prisma.inventory.findMany({
      where,
      select: {
        soldDate: true,
        project: true,
        price: true,
        agentId: true,
      },
    });

    // Monthly sales data - group manually
    const monthlyMap = {};
    soldInventory.forEach(item => {
      if (item.soldDate) {
        const month = item.soldDate.getMonth() + 1;
        const year = item.soldDate.getFullYear();
        const key = `${year}-${month}`;
        
        if (!monthlyMap[key]) {
          monthlyMap[key] = { month, year, count: 0, revenue: 0 };
        }
        monthlyMap[key].count += 1;
        monthlyMap[key].revenue += item.price || 0;
      }
    });

    const monthlySales = Object.values(monthlyMap)
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .map(item => ({
        _id: { month: item.month, year: item.year },
        count: item.count,
        revenue: item.revenue,
      }));

    // Project-wise sales - group manually
    const projectMap = {};
    soldInventory.forEach(item => {
      const project = item.project || 'Unknown';
      if (!projectMap[project]) {
        projectMap[project] = { count: 0, revenue: 0 };
      }
      projectMap[project].count += 1;
      projectMap[project].revenue += item.price || 0;
    });

    const projectSales = Object.entries(projectMap).map(([project, data]) => ({
      _id: project,
      count: data.count,
      revenue: data.revenue,
    }));

    // Top agents - group manually and get top 5
    const agentMap = {};
    soldInventory.forEach(item => {
      if (item.agentId) {
        if (!agentMap[item.agentId]) {
          agentMap[item.agentId] = { sales: 0, revenue: 0 };
        }
        agentMap[item.agentId].sales += 1;
        agentMap[item.agentId].revenue += item.price || 0;
      }
    });

    // Get agent info for top agents
    const topAgentIds = Object.entries(agentMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([agentId]) => agentId);

    const agentInfos = await prisma.user.findMany({
      where: { id: { in: topAgentIds } },
      select: { id: true, name: true },
    });

    const topAgents = topAgentIds.map(agentId => ({
      _id: agentId,
      sales: agentMap[agentId].sales,
      revenue: agentMap[agentId].revenue,
      agentInfo: agentInfos.find(a => a.id === agentId),
    }));

    res.json({
      success: true,
      data: {
        monthlySales,
        projectSales,
        topAgents,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/reports/payments
// @desc    Get payment report
// @access  Private
router.get('/payments', protect, async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod } = req.query;

    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (paymentMethod && paymentMethod !== 'All') {
      where.paymentMethod = paymentMethod.toUpperCase().replace(' ', '_');
    }

    // Get all matching vouchers
    const vouchers = await prisma.voucher.findMany({
      where,
      select: {
        paymentMethod: true,
        amount: true,
        date: true,
      },
    });

    // Group by payment method
    const methodMap = {};
    vouchers.forEach(voucher => {
      const method = voucher.paymentMethod || 'Unknown';
      if (!methodMap[method]) {
        methodMap[method] = { count: 0, totalAmount: 0 };
      }
      methodMap[method].count += 1;
      methodMap[method].totalAmount += voucher.amount || 0;
    });

    const payments = Object.entries(methodMap).map(([method, data]) => ({
      _id: method,
      count: data.count,
      totalAmount: data.totalAmount,
    }));

    // Group by date for daily payments
    const dailyMap = {};
    vouchers.forEach(voucher => {
      const date = voucher.date ? voucher.date.toISOString().split('T')[0] : 'Unknown';
      if (!dailyMap[date]) {
        dailyMap[date] = { count: 0, amount: 0 };
      }
      dailyMap[date].count += 1;
      dailyMap[date].amount += voucher.amount || 0;
    });

    const dailyPayments = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        _id: { date },
        count: data.count,
        amount: data.amount,
      }));

    res.json({
      success: true,
      data: {
        byMethod: payments,
        daily: dailyPayments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
