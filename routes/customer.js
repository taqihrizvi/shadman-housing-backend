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
    const customerData = {
      ...req.body,
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
