import express from 'express';
import prisma from '../config/database.js';
import { protect, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// @route   GET /api/approvals/biyana
// @desc    Get all pending Biyana forms for approval
// @access  Admin only
router.get('/biyana', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingBiyanas = await prisma.biyana.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingBiyanas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/biyana/:id/approve
// @desc    Approve a Biyana form
// @access  Admin only
router.put('/biyana/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const biyana = await prisma.biyana.findUnique({
      where: { id },
    });

    if (!biyana) {
      return res.status(404).json({
        success: false,
        message: 'Biyana form not found',
      });
    }

    if (biyana.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Biyana form has already been processed',
      });
    }

    // Update Biyana status to APPROVED
    const updatedBiyana = await prisma.biyana.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update inventory status to RESERVED after approval
    await prisma.inventory.update({
      where: { id: biyana.plotId },
      data: {
        status: 'RESERVED',
        buyerId: biyana.customerId,
      },
    });

    // Create notification for the form creator
    await createNotification(
      biyana.createdById,
      'APPROVED',
      'Biyana Form Approved',
      `Your Biyana form ${biyana.formNumber} has been approved`,
      biyana.id,
      'BIYANA'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: biyana.id,
        relatedType: 'BIYANA',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedBiyana,
      message: 'Biyana form approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/biyana/:id/reject
// @desc    Reject a Biyana form
// @access  Admin only
router.put('/biyana/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const biyana = await prisma.biyana.findUnique({
      where: { id },
    });

    if (!biyana) {
      return res.status(404).json({
        success: false,
        message: 'Biyana form not found',
      });
    }

    if (biyana.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Biyana form has already been processed',
      });
    }

    const updatedBiyana = await prisma.biyana.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        remarks: reason || biyana.remarks,
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update inventory status back to AVAILABLE when rejected
    await prisma.inventory.update({
      where: { id: biyana.plotId },
      data: { status: 'AVAILABLE' },
    });

    // Create notification for the form creator
    await createNotification(
      biyana.createdById,
      'REJECTED',
      'Biyana Form Rejected',
      `Your Biyana form ${biyana.formNumber} has been rejected${reason ? ': ' + reason : ''}`,
      biyana.id,
      'BIYANA'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: biyana.id,
        relatedType: 'BIYANA',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedBiyana,
      message: 'Biyana form rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/sale-agreement
// @desc    Get all pending Sale Agreements for approval
// @access  Admin only
router.get('/sale-agreement', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingAgreements = await prisma.saleAgreement.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingAgreements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/sale-agreement/:id/approve
// @desc    Approve a Sale Agreement
// @access  Admin only
router.put('/sale-agreement/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.saleAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Sale Agreement not found',
      });
    }

    if (agreement.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Sale Agreement has already been processed',
      });
    }

    // Update Sale Agreement status to APPROVED
    const updatedAgreement = await prisma.saleAgreement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update inventory status to SOLD when approved
    await prisma.inventory.update({
      where: { id: agreement.plotId },
      data: {
        status: 'SOLD',
        soldDate: new Date(),
      },
    });

    // Customer updated (totalInvestment field removed from schema)

    // Create notification for the form creator
    await createNotification(
      agreement.createdById,
      'APPROVED',
      'Sale Agreement Approved',
      `Your Sale Agreement ${agreement.formNumber} has been approved`,
      agreement.id,
      'SALE_AGREEMENT'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: agreement.id,
        relatedType: 'SALE_AGREEMENT',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedAgreement,
      message: 'Sale Agreement approved',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/sale-agreement/:id/reject
// @desc    Reject a Sale Agreement
// @access  Admin only
router.put('/sale-agreement/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const agreement = await prisma.saleAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Sale Agreement not found',
      });
    }

    if (agreement.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Sale Agreement has already been processed',
      });
    }

    const updatedAgreement = await prisma.saleAgreement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        terms: reason ? `${agreement.terms}\n\nRejection Reason: ${reason}` : agreement.terms,
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update inventory status back to AVAILABLE when rejected
    await prisma.inventory.update({
      where: { id: agreement.plotId },
      data: { status: 'AVAILABLE', buyerId: null },
    });

    // Create notification for the form creator
    await createNotification(
      agreement.createdById,
      'REJECTED',
      'Sale Agreement Rejected',
      `Your Sale Agreement ${agreement.formNumber} has been rejected${reason ? ': ' + reason : ''}`,
      agreement.id,
      'SALE_AGREEMENT'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: agreement.id,
        relatedType: 'SALE_AGREEMENT',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedAgreement,
      message: 'Sale Agreement rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/transfer
// @desc    Get all pending Transfer forms for approval
// @access  Admin only
router.get('/transfer', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingTransfers = await prisma.transferForm.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        fromCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        toCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingTransfers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/transfer/:id/approve
// @desc    Approve a Transfer form
// @access  Admin only
router.put('/transfer/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transferForm.findUnique({
      where: { id },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer form not found',
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Transfer form has already been processed',
      });
    }

    // Update Transfer status to APPROVED
    const updatedTransfer = await prisma.transferForm.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
      },
      include: {
        fromCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        toCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update plot buyer
    await prisma.inventory.update({
      where: { id: transfer.plotId },
      data: {
        buyerId: transfer.toCustomerId,
      },
    });

    // Create notification for the form creator
    await createNotification(
      transfer.createdById,
      'APPROVED',
      'Transfer Form Approved',
      `Transfer form ${transfer.transferNumber} has been approved`,
      transfer.id,
      'TRANSFER'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: transfer.id,
        relatedType: 'TRANSFER',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer form approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/transfer/:id/reject
// @desc    Reject a Transfer form
// @access  Admin only
router.put('/transfer/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const transfer = await prisma.transferForm.findUnique({
      where: { id },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer form not found',
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Transfer form has already been processed',
      });
    }

    const updatedTransfer = await prisma.transferForm.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        reason: reason ? `${transfer.reason || ''}\n\nRejection Reason: ${reason}` : transfer.reason,
      },
      include: {
        fromCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        toCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Create notification for the form creator
    await createNotification(
      transfer.createdById,
      'REJECTED',
      'Transfer Form Rejected',
      `Transfer form ${transfer.transferNumber} has been rejected${reason ? ': ' + reason : ''}`,
      transfer.id,
      'TRANSFER'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: transfer.id,
        relatedType: 'TRANSFER',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer form rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/stats
// @desc    Get approval statistics
// @access  Admin only
router.get('/stats', protect, authorize('ADMIN'), async (req, res) => {
  try {
    // Optimized query using groupBy to reduce database connections
    const [biyanaCounts, agreementCounts, transferCounts, voucherCounts] = await Promise.all([
      prisma.biyana.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.saleAgreement.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.transferForm.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.voucher.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    // Helper function to extract counts
    const getCounts = (data) => {
      const pending = data.find(d => d.status === 'PENDING')?._count.id || 0;
      const approved = data.find(d => d.status === 'APPROVED')?._count.id || 0;
      const rejected = data.find(d => d.status === 'REJECTED')?._count.id || 0;
      return { pending, approved, rejected, total: pending + approved + rejected };
    };

    res.json({
      success: true,
      data: {
        forms: getCounts(biyanaCounts),
        agreements: getCounts(agreementCounts),
        transfers: getCounts(transferCounts),
        payments: getCounts(voucherCounts),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/payments
// @desc    Get all pending payment vouchers for approval
// @access  Admin only
router.get('/payments', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingPayments = await prisma.voucher.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/payments/:id/approve
// @desc    Approve a payment voucher
// @access  Admin only
router.put('/payments/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Payment voucher not found',
      });
    }

    if (voucher.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This payment voucher has already been processed',
      });
    }

    // Update voucher status to APPROVED
    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Create notification for the form creator
    await createNotification(
      voucher.createdById,
      'APPROVED',
      'Payment Approved',
      `Your payment voucher ${voucher.voucherNumber} has been approved`,
      voucher.id,
      'PAYMENT'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: voucher.id,
        relatedType: 'PAYMENT',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedVoucher,
      message: 'Payment voucher approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/payments/:id/reject
// @desc    Reject a payment voucher
// @access  Admin only
router.put('/payments/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Payment voucher not found',
      });
    }

    if (voucher.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This payment voucher has already been processed',
      });
    }

    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        description: reason || voucher.description,
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Create notification for the form creator
    await createNotification(
      voucher.createdById,
      'REJECTED',
      'Payment Rejected',
      `Your payment voucher ${voucher.voucherNumber} has been rejected${reason ? ': ' + reason : ''}`,
      voucher.id,
      'PAYMENT'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: voucher.id,
        relatedType: 'PAYMENT',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedVoucher,
      message: 'Payment voucher rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
