import express from 'express';
import prisma from '../config/database.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { validateRequest } from '../middleware/security.js';
import { paymentSchema } from '../validators/forms.validator.js';

const router = express.Router();

// Generate voucher number
const generateVoucherNumber = async () => {
  const year = new Date().getFullYear();
  const lastVoucher = await prisma.voucher.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  
  let number = 1;
  if (lastVoucher) {
    const lastNumber = parseInt(lastVoucher.voucherNo.split('-')[2]);
    number = lastNumber + 1;
  }
  
  return `RV-${year}-${String(number).padStart(3, '0')}`;
};

// @route   GET /api/vouchers
// @desc    Get all vouchers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const where = {};
    
    if (type) where.type = type.toUpperCase().replace(' ', '_');
    if (search) {
      where.OR = [
        { voucherNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: {
        customer: { select: { name: true, cnic: true, phone: true } },
        plot: { select: { plotNo: true, project: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: limit * 1,
      skip: (page - 1) * limit,
    });

    const count = await prisma.voucher.count({ where });

    res.json({
      success: true,
      data: vouchers,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/vouchers/:id
// @desc    Get single voucher
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { name: true, cnic: true, phone: true, address: true } },
        plot: { select: { plotNo: true, project: true, size: true, price: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true, signature: true } },
      },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found',
      });
    }

    res.json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/vouchers
// @desc    Create new voucher (PENDING until approved by admin)
// @access  Private
router.post('/', protect, validateRequest(paymentSchema), async (req, res) => {
  try {
    const voucherNo = await generateVoucherNumber();
    const { formType, plotId, customerId, amount, ...restData } = req.body;
    
    let finalAmount = amount;
    let finalCustomerId = customerId;
    let description = restData.description || '';

    // Auto-fetch amounts for BIYANA and SALES_AGREEMENT types
    if (formType === 'BIYANA' && plotId) {
      // Check if a Biyana voucher already exists for this plot
      const existingBiyanaVoucher = await prisma.voucher.findFirst({
        where: {
          plotId: plotId,
          formType: 'BIYANA',
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      if (existingBiyanaVoucher) {
        return res.status(400).json({
          success: false,
          message: 'Biyana voucher for this plot already exists'
        });
      }

      // Fetch latest approved Biyana form for this plot
      const biyanaForm = await prisma.biyana.findFirst({
        where: {
          plotId: plotId,
          status: 'APPROVED'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!biyanaForm) {
        return res.status(400).json({
          success: false,
          message: 'No approved Biyana form found for this plot'
        });
      }

      finalAmount = biyanaForm.biyanaAmount;
      finalCustomerId = biyanaForm.customerId;
      description = description || `Biyana Payment - ${biyanaForm.formNumber}`;
    } else if (formType === 'SALES_AGREEMENT' && plotId) {
      // Check if a Sales Agreement voucher already exists for this plot
      const existingSalesVoucher = await prisma.voucher.findFirst({
        where: {
          plotId: plotId,
          formType: 'SALES_AGREEMENT',
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      if (existingSalesVoucher) {
        return res.status(400).json({
          success: false,
          message: 'Sales Agreement voucher for this plot already exists'
        });
      }

      // Fetch latest active Sale Agreement for this plot
      const saleAgreement = await prisma.saleAgreement.findFirst({
        where: {
          plotId: plotId,
          status: 'APPROVED',
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!saleAgreement) {
        return res.status(400).json({
          success: false,
          message: 'No active Sales Agreement found for this plot'
        });
      }

      finalAmount = saleAgreement.downPayment;
      finalCustomerId = saleAgreement.customerId;
      description = description || `Sales Agreement Down Payment - ${saleAgreement.agreementNumber}`;
    }
    
    const voucherData = {
      ...restData,
      voucherNo,
      amount: finalAmount,
      customerId: finalCustomerId,
      plotId,
      formType,
      description,
      status: 'PENDING', // Set status as PENDING for admin approval
      createdById: req.user.id,
    };

    const voucher = await prisma.voucher.create({
      data: voucherData,
    });

    // Notify all admins about the new pending payment approval
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'APPROVAL_PENDING',
        'New Payment Approval',
        `New payment voucher ${voucherNo} submitted for approval`,
        voucher.id,
        'PAYMENT'
      );
    }

    res.status(201).json({
      success: true,
      data: voucher,
      message: 'Voucher submitted for approval',
    });
  } catch (error) {
    console.error('Voucher creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/vouchers/:id
// @desc    Update voucher
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const voucher = await prisma.voucher.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/vouchers/:id
// @desc    Delete voucher
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    await prisma.voucher.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Voucher deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
