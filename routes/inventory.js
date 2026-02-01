import express from 'express';
import prisma from '../config/database.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/inventory
// @desc    Get all inventory with filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, project, search, page = 1, limit = 50 } = req.query;
    
    console.log('📋 GET /api/inventory - Query params:', { status, project, search, page, limit });
    
    const where = {};
    
    // Handle multiple status values (comma-separated)
    if (status) {
      const statusValues = status.split(',').map(s => s.trim().toUpperCase());
      if (statusValues.length === 1) {
        where.status = statusValues[0];
      } else {
        where.status = { in: statusValues };
      }
    }
    
    if (project && project !== 'All Projects') where.project = project.toUpperCase().replace(/ /g, '_');
    if (search) {
      where.OR = [
        { plotNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    console.log('📋 Query where clause:', JSON.stringify(where, null, 2));

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        buyer: {
          select: { name: true, cnic: true, phone: true },
        },
        agent: {
          select: { name: true, email: true },
        },
        biyanaForms: {
          select: { 
            tokenAmount: true, 
            downPayment: true,
            date: true,
            totalAmount: true,
            monthlyInstallments: true,
            quarterlyInstallments: true,
            monthlyInstallmentAmount: true,
            quarterlyInstallmentAmount: true,
            installmentType: true,
            agreementDuration: true,
            customer: {
              select: { name: true, fatherName: true, cnic: true, phone: true, address: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    });

    const count = await prisma.inventory.count({ where });

    console.log(`✅ Retrieved ${inventory.length} inventory items`);

    res.json({
      success: true,
      data: inventory,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ GET /api/inventory error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/inventory/:id
// @desc    Get single inventory item
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: {
          select: { name: true, cnic: true, phone: true, email: true, address: true },
        },
        agent: {
          select: { name: true, email: true },
        },
        createdBy: {
          select: { name: true },
        },
      },
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/inventory
// @desc    Create new inventory
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // Check if plot number already exists
    const existingPlot = await prisma.inventory.findUnique({
      where: { plotNo: req.body.plotNo },
    });

    if (existingPlot) {
      return res.status(400).json({
        success: false,
        message: `Plot number ${req.body.plotNo} already exists. Please use a different plot number.`,
        field: 'plotNo',
      });
    }

    const inventoryData = {
      ...req.body,
      project: req.body.project?.toUpperCase().replace(/ /g, '_'),
      size: req.body.size?.toUpperCase().replace(/ /g, '_'),
      status: req.body.status?.toUpperCase() || 'AVAILABLE',
      createdById: req.user.id,
    };

    const inventory = await prisma.inventory.create({
      data: inventoryData,
    });

    res.status(201).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: `Plot number already exists. Please use a different plot number.`,
        field: 'plotNo',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update inventory
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Check if plotNo is being updated and if it already exists
    if (updateData.plotNo) {
      const existingPlot = await prisma.inventory.findFirst({
        where: {
          plotNo: updateData.plotNo,
          id: { not: req.params.id }, // Exclude current plot
        },
      });

      if (existingPlot) {
        return res.status(400).json({
          success: false,
          message: `Plot number ${updateData.plotNo} already exists. Please use a different plot number.`,
          field: 'plotNo',
        });
      }
    }
    
    // Convert enum values if present
    if (updateData.project) {
      updateData.project = updateData.project.toUpperCase().replace(/ /g, '_');
    }
    if (updateData.size) {
      updateData.size = updateData.size.toUpperCase().replace(/ /g, '_');
    }
    if (updateData.status) {
      updateData.status = updateData.status.toUpperCase();
    }

    // Check if status is changing from RESERVED to something else
    const currentInventory = await prisma.inventory.findUnique({
      where: { id: req.params.id },
    });

    if (!currentInventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    // If status is changing from RESERVED to AVAILABLE, reject associated Biyana forms
    if (
      currentInventory.status === 'RESERVED' && 
      updateData.status && 
      updateData.status !== 'RESERVED'
    ) {
      // Update all APPROVED Biyana forms for this plot to REJECTED
      await prisma.biyana.updateMany({
        where: {
          plotId: req.params.id,
          status: 'APPROVED',
        },
        data: {
          status: 'REJECTED',
          updatedAt: new Date(),
        },
      });
    }

    const inventory = await prisma.inventory.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: `Plot number already exists. Please use a different plot number.`,
        field: 'plotNo',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/inventory/:id
// @desc    Delete inventory
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: req.params.id },
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    // Check if plot is sold
    if (inventory.status === 'SOLD') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete sold property',
      });
    }

    await prisma.inventory.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Inventory deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/inventory/stats/summary
// @desc    Get inventory statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const totalInventory = await prisma.inventory.count();
    const soldCount = await prisma.inventory.count({ where: { status: 'SOLD' } });
    const unsoldCount = await prisma.inventory.count({ where: { status: 'AVAILABLE' } });
    const reservedCount = await prisma.inventory.count({ where: { status: 'RESERVED' } });

    const totalValue = await prisma.inventory.aggregate({
      _sum: { price: true },
    });

    const soldValue = await prisma.inventory.aggregate({
      where: { status: 'SOLD' },
      _sum: { price: true },
    });

    res.json({
      success: true,
      data: {
        totalInventory,
        soldCount,
        unsoldCount,
        reservedCount,
        totalValue: totalValue._sum.price || 0,
        soldValue: soldValue._sum.price || 0,
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
