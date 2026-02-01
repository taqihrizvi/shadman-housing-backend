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
    let biyanaId = null;
    let saleAgreementId = null;
    let transferId = null;

    // ✅ BUSINESS RULE: Link voucher to form for approval workflow
    // Auto-fetch amounts for BIYANA and SALES_AGREEMENT types
    if (formType === 'BIYANA' && plotId) {
      // Fetch latest PENDING Biyana form for this plot (not APPROVED - voucher must exist before approval)
      const biyanaForm = await prisma.biyana.findFirst({
        where: {
          plotId: plotId,
          status: 'PENDING'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!biyanaForm) {
        return res.status(400).json({
          success: false,
          message: 'No PENDING Biyana form found for this plot. Form must be created before voucher.'
        });
      }

      // Check if a non-rejected voucher already exists for this Biyana
      const existingVoucher = await prisma.voucher.findFirst({
        where: {
          biyanaId: biyanaForm.id,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      if (existingVoucher) {
        return res.status(400).json({
          success: false,
          message: 'A voucher already exists for this Biyana form. Create a new voucher only if previous was rejected.'
        });
      }

      finalAmount = biyanaForm.tokenAmount;
      finalCustomerId = biyanaForm.customerId;
      biyanaId = biyanaForm.id;
      description = description || `Biyana Payment - ${biyanaForm.formNumber}`;
    } else if (formType === 'SALES_AGREEMENT' && plotId) {
      // Fetch latest PENDING Sale Agreement for this plot
      const saleAgreement = await prisma.saleAgreement.findFirst({
        where: {
          plotId: plotId,
          status: 'PENDING',
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!saleAgreement) {
        return res.status(400).json({
          success: false,
          message: 'No PENDING Sales Agreement found for this plot. Form must be created before voucher.'
        });
      }

      // Check if a non-rejected voucher already exists for this Sale Agreement
      const existingVoucher = await prisma.voucher.findFirst({
        where: {
          saleAgreementId: saleAgreement.id,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      if (existingVoucher) {
        return res.status(400).json({
          success: false,
          message: 'A voucher already exists for this Sale Agreement. Create a new voucher only if previous was rejected.'
        });
      }

      finalAmount = saleAgreement.downPayment;
      finalCustomerId = saleAgreement.customerId;
      saleAgreementId = saleAgreement.id;
      description = description || `Sales Agreement Down Payment - ${saleAgreement.agreementNumber}`;
    } else if (formType === 'TRANSFER' && plotId) {
      // Fetch latest PENDING Transfer form for this plot
      const transferForm = await prisma.transferForm.findFirst({
        where: {
          plotId: plotId,
          status: 'PENDING'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!transferForm) {
        return res.status(400).json({
          success: false,
          message: 'No PENDING Transfer form found for this plot. Form must be created before voucher.'
        });
      }

      // Check if a non-rejected voucher already exists for this Transfer
      const existingVoucher = await prisma.voucher.findFirst({
        where: {
          transferId: transferForm.id,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      if (existingVoucher) {
        return res.status(400).json({
          success: false,
          message: 'A voucher already exists for this Transfer form. Create a new voucher only if previous was rejected.'
        });
      }

      finalAmount = transferForm.transferFee;
      finalCustomerId = transferForm.toCustomerId; // New owner pays transfer fee
      transferId = transferForm.id;
      description = description || `Transfer Fee - ${transferForm.transferNumber}`;
    }
    
    const voucherData = {
      ...restData,
      voucherNo,
      amount: finalAmount,
      customerId: finalCustomerId,
      plotId,
      formType,
      description,
      biyanaId,           // Link to Biyana form
      saleAgreementId,    // Link to Sale Agreement
      transferId,         // Link to Transfer form
      status: 'PENDING',  // Set status as PENDING for admin approval
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
