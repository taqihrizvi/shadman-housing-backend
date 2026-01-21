import express from 'express';
import prisma from '../config/database.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cnic: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        plots: {
          select: { plotNo: true, project: true, size: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    });

    const count = await prisma.customer.count({ where });

    res.json({
      success: true,
      data: customers,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        plots: true,
        createdBy: {
          select: { name: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { cnic, phone, name, fatherName, address } = req.body;

    // Validate CNIC: exactly 13 digits, numbers only
    if (!cnic || !/^\d{13}$/.test(cnic)) {
      return res.status(400).json({
        success: false,
        message: 'CNIC must be exactly 13 digits and contain only numbers'
      });
    }

    // Validate phone: max 11 digits, numbers only
    if (!phone || !/^\d{1,11}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be at most 11 digits and contain only numbers'
      });
    }

    // Check CNIC uniqueness
    const existingCustomer = await prisma.customer.findFirst({
      where: { cnic }
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this CNIC already exists'
      });
    }

    const customerData = {
      name,
      fatherName,
      cnic,
      phone,
      address,
      createdById: req.user.id,
    };

    const customer = await prisma.customer.create({
      data: customerData,
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Customer with this CNIC already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { cnic, phone } = req.body;

    // Validate CNIC if provided: exactly 13 digits, numbers only
    if (cnic && !/^\d{13}$/.test(cnic)) {
      return res.status(400).json({
        success: false,
        message: 'CNIC must be exactly 13 digits and contain only numbers'
      });
    }

    // Validate phone if provided: max 11 digits, numbers only
    if (phone && !/^\d{1,11}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be at most 11 digits and contain only numbers'
      });
    }

    // Check CNIC uniqueness (exclude current customer)
    if (cnic) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { 
          cnic,
          id: { not: req.params.id }
        }
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'A customer with this CNIC already exists'
        });
      }
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/customers/:id/pending-payments
// @desc    Get customer's pending payments (based on current plot ownership)
// @access  Private
router.get('/:id/pending-payments', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current customer info
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, name: true, fatherName: true, cnic: true, phone: true },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Get all plots currently owned by this customer
    const customerPlots = await prisma.inventory.findMany({
      where: { buyerId: id },
      select: { id: true, plotNo: true, project: true, size: true },
    });

    if (!customerPlots || customerPlots.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    const plotIds = customerPlots.map(plot => plot.id);

    // Get approved sale agreements for these plots
    const agreements = await prisma.saleAgreement.findMany({
      where: {
        plotId: { in: plotIds },
        status: 'APPROVED',
      },
      select: {
        id: true,
        plotId: true,
        totalAmount: true,
        downPayment: true,
        agreementDate: true,
      },
    });

    // Calculate pending payments for each plot
    const pendingPayments = await Promise.all(
      agreements.map(async (agreement) => {
        // Get APPROVED vouchers only for this plot
        const vouchers = await prisma.voucher.findMany({
          where: {
            plotId: agreement.plotId,
            type: 'RECEIPT',
            status: 'APPROVED',
          },
          select: { amount: true, date: true },
        });

        // Get APPROVED biyana payment for this plot
        const biyana = await prisma.biyana.findFirst({
          where: {
            plotId: agreement.plotId,
            status: 'APPROVED',
          },
          select: {
            biyanaAmount: true,
          },
        });

        // Calculate total paid: Down Payment + Approved Biyana + Approved Vouchers
        const totalVoucherAmount = vouchers.reduce((sum, v) => sum + v.amount, 0);
        const biyanaAmount = biyana?.biyanaAmount || 0;
        const downPayment = agreement.downPayment || 0;
        const totalPaid = downPayment + biyanaAmount + totalVoucherAmount;
        const pendingAmount = agreement.totalAmount - totalPaid;
        
        const plot = customerPlots.find(p => p.id === agreement.plotId);

        return {
          customer: {
            id: customer.id,
            name: customer.name,
            fatherName: customer.fatherName,
            cnic: customer.cnic,
            phone: customer.phone,
          },
          plotId: agreement.plotId,
          plotNo: plot?.plotNo,
          project: plot?.project,
          size: plot?.size,
          totalAmount: agreement.totalAmount,
          downPayment,
          biyanaAmount,
          totalVoucherAmount,
          totalPaid,
          pendingAmount,
          agreementDate: agreement.agreementDate,
          lastPaymentDate: vouchers.length > 0 
            ? vouchers.sort((a, b) => b.date - a.date)[0].date 
            : null,
        };
      })
    );

    // Filter out plots with no pending amount
    const activePending = pendingPayments.filter(p => p.pendingAmount > 0);
    const totalPending = activePending.reduce((sum, p) => sum + p.pendingAmount, 0);

    res.json({
      success: true,
      data: activePending,
      total: totalPending,
      customerInfo: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        plots: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Check if customer has plots
    if (customer.plots && customer.plots.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with associated plots',
      });
    }

    await prisma.customer.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
